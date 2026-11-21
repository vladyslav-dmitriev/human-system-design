import { PaymentHandler } from './payment.handler';

jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
}));

describe('PaymentHandler', () => {
  const queue = { add: jest.fn() };
  const handler = new PaymentHandler(queue as never);
  const event = {
    id: 'evt_1',
    type: 'invoice.paid',
    data: { object: { id: 'in_1' } },
  };

  beforeEach(() => jest.resetAllMocks());

  it.each([
    ['handleSubscriptionPurchase', 'subscription-purchase'],
    ['handleSubscriptionUpgrade', 'subscription-upgrade'],
    ['handleSubscriptionSync', 'subscription-sync'],
    ['handleOneTimePurchase', 'one-time-purchase'],
  ] as const)(
    '%s puts the event object into payment-queue as %s with jobId = event.id',
    async (method, jobName) => {
      await handler[method](event as never);

      expect(queue.add).toHaveBeenCalledWith(
        jobName,
        { eventId: 'evt_1', object: { id: 'in_1' } },
        { jobId: 'evt_1' },
      );
    },
  );

  it('propagates a queue failure so the webhook answers 5xx and Stripe retries', async () => {
    queue.add.mockRejectedValue(new Error('redis down'));

    await expect(handler.handleOneTimePurchase(event as never)).rejects.toThrow(
      'redis down',
    );
  });
});
