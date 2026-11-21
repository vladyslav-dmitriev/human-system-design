/* eslint-disable @typescript-eslint/require-await -- in-memory Redis/queue fakes mimic async clients */
import { PaymentHandler } from './payment.handler';
import { PaymentProcessor } from './payment.processes';
import { WebhookService } from './webhook.service';

jest.mock('@nestjs/bullmq', () => ({
  WorkerHost: class WorkerHost {},
  Processor: () => () => undefined,
  OnWorkerEvent: () => () => undefined,
  InjectQueue: () => () => undefined,
}));
jest.mock('../../../redis', () => ({ REDIS_CLIENT: 'REDIS_CLIENT' }));
jest.mock('../../payment-method', () => ({ PaymentMethodService: class {} }));
jest.mock('../../payments', () => ({ PaymentsService: class {} }));
jest.mock('../../invoice', () => ({ InvoiceService: class {} }));
jest.mock('../../../user', () => ({ UserRepository: class {} }));
jest.mock('../../feature', () => ({ FeatureRepository: class {} }));

/**
 * Сценарий: событие 5 раз падает, задача остаётся в failed. Ручной resend из Stripe
 * (тот же event.id) должен быть поставлен в очередь и обработан, а не отброшен как дубль
 * ни по ключу идемпотентности, ни по jobId = event.id.
 */
describe('Stripe webhook: manual resend after exhausted retries', () => {
  const store = new Map<string, string>();
  const redis = {
    set: jest.fn(async (k: string, v: string, ...a: (string | number)[]) => {
      if (a.includes('NX') && store.has(k)) return null;
      store.set(k, v);

      return 'OK';
    }),
    del: jest.fn(async (k: string) => (store.delete(k) ? 1 : 0)),
  };

  // как BullMQ: add() с уже существующим jobId (в любом состоянии, в т.ч. failed) молча игнорируется
  type FakeJob = {
    id: string;
    name: string;
    data: { eventId: string; object: unknown };
    attemptsMade: number;
    opts: { attempts: number };
    remove: () => Promise<void>;
  };
  const jobs = new Map<string, FakeJob>();
  const queue = {
    add: jest.fn(
      async (name: string, data: FakeJob['data'], opts: { jobId: string }) => {
        if (jobs.has(opts.jobId)) return jobs.get(opts.jobId);
        const job: FakeJob = {
          id: opts.jobId,
          name,
          data,
          attemptsMade: 0,
          opts: { attempts: 5 },
          remove: async () => {
            jobs.delete(opts.jobId);
          },
        };

        jobs.set(opts.jobId, job);

        return job;
      },
    ),
  };

  const payments = {
    constructEvent: jest.fn(),
    getSubscription: jest.fn(),
  };
  const userRepository = {
    getUserByStripeCustomerId: jest.fn(),
    updateBillingSubscription: jest.fn(),
  };

  const event = {
    id: 'evt_resend',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        cancel_at_period_end: false,
        items: { data: [{ price: { id: 'p1' }, current_period_end: 1 }] },
      },
    },
  };

  const handler = new PaymentHandler(queue as never);
  const service = new WebhookService(
    handler,
    payments as never,
    redis as never,
  );
  const processor = new PaymentProcessor(
    userRepository as never,
    payments as never,
    {} as never,
    {} as never,
    {} as never,
    redis as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    store.clear();
    jobs.clear();
    payments.constructEvent.mockResolvedValue(event);
    payments.getSubscription.mockResolvedValue(event.data.object);
  });

  it('5 failures -> resend -> processed', async () => {
    userRepository.getUserByStripeCustomerId.mockRejectedValue(new Error('db'));

    await service.execute(Buffer.from('{}'), 'sig');
    const job = jobs.get('evt_resend');

    expect(queue.add).toHaveBeenCalledTimes(1);

    // 5 неудачных попыток BullMQ
    for (let attempt = 1; attempt <= 5; attempt++) {
      job.attemptsMade = attempt;
      await expect(processor.process(job as never)).rejects.toThrow('db');
      await processor.onFailed(job as never, new Error('db'));
    }

    // задача и ключ освобождены
    expect(jobs.has('evt_resend')).toBe(false);
    expect(store.has('stripe-webhook-event:evt_resend')).toBe(false);

    // ручной resend: тот же event.id
    userRepository.getUserByStripeCustomerId.mockResolvedValue({
      userId: 'u1',
    });
    await service.execute(Buffer.from('{}'), 'sig');

    expect(queue.add).toHaveBeenCalledTimes(2);
    const resent = jobs.get('evt_resend');

    await processor.process(resent as never);

    expect(userRepository.updateBillingSubscription).toHaveBeenCalledTimes(1);
  });

  it('without job.remove() the resend would be dropped (the bug this guards against)', async () => {
    await service.execute(Buffer.from('{}'), 'sig');
    const job = jobs.get('evt_resend');

    job.attemptsMade = 5;
    // старое поведение: освобождается только ключ, задача остаётся
    store.delete('stripe-webhook-event:evt_resend');
    await service.execute(Buffer.from('{}'), 'sig');

    expect(jobs.get('evt_resend')).toBe(job);
    expect(job.attemptsMade).toBe(5); // новая задача не создана
  });
});
