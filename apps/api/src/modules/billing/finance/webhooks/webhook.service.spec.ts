import { BadRequestException } from '@nestjs/common';

import { WebhookService } from './webhook.service';
import { WEBHOOK_EVENT_TTL_SECONDS } from './webhook-idempotency';

jest.mock('./payment.handler', () => ({ PaymentHandler: class {} }));
jest.mock('../../payments', () => ({ PaymentsService: class {} }));
jest.mock('../../../redis', () => ({ REDIS_CLIENT: 'REDIS_CLIENT' }));

describe('WebhookService', () => {
  const handler = {
    handleSubscriptionPurchase: jest.fn(),
    handleSubscriptionUpgrade: jest.fn(),
    handleSubscriptionSync: jest.fn(),
    handleOneTimePurchase: jest.fn(),
  };
  const payments = { constructEvent: jest.fn() };
  const redis = { set: jest.fn(), del: jest.fn() };
  const service = new WebhookService(
    handler as never,
    payments as never,
    redis as never,
  );
  const raw = Buffer.from('{}');
  const event = (type: string, object: unknown = {}, id = 'evt_1') => ({
    id,
    type,
    data: { object },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    redis.set.mockResolvedValue('OK');
    redis.del.mockResolvedValue(1);
  });

  describe('signature', () => {
    it('rejects an invalid signature with 400, no Redis claim and no handler', async () => {
      payments.constructEvent.mockRejectedValue(new Error('bad signature'));

      await expect(service.execute(raw, 'sig')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(payments.constructEvent).toHaveBeenCalledWith(raw, 'sig');
      expect(redis.set).not.toHaveBeenCalled();
      Object.values(handler).forEach((h) => expect(h).not.toHaveBeenCalled());
    });

    it('does not leak the Stripe SDK error text into the response', async () => {
      payments.constructEvent.mockRejectedValue(
        new Error(
          'StripeSignatureVerificationError: No signatures found matching the expected signature. See https://docs.stripe.com/webhooks#verify-manually',
        ),
      );

      const error = await service.execute(raw, 'sig').catch((e: unknown) => e);
      const body = JSON.stringify((error as BadRequestException).getResponse());

      expect(body).toContain('Invalid webhook signature');
      expect(body).not.toMatch(/Stripe|docs\.stripe\.com|signatures found/);
    });

    it('turns a synchronous constructEvent throw (missing secret) into 400', async () => {
      payments.constructEvent.mockImplementation(() => {
        throw new Error('STRIPE_WEBHOOK_SECRET is missing');
      });

      await expect(service.execute(raw, 'sig')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('routing', () => {
    it('routes invoice.paid to the subscription purchase handler', async () => {
      const e = event('invoice.paid');

      payments.constructEvent.mockResolvedValue(e);
      await service.execute(raw, 'sig');

      expect(handler.handleSubscriptionPurchase).toHaveBeenCalledWith(e);
      expect(handler.handleOneTimePurchase).not.toHaveBeenCalled();
    });

    it('routes payment_intent.succeeded with metadata.type=one_time to one-time purchase', async () => {
      const e = event('payment_intent.succeeded', {
        metadata: { type: 'one_time' },
      });

      payments.constructEvent.mockResolvedValue(e);
      await service.execute(raw, 'sig');

      expect(handler.handleOneTimePurchase).toHaveBeenCalledWith(e);
      expect(handler.handleSubscriptionUpgrade).not.toHaveBeenCalled();
    });

    it('routes payment_intent.succeeded with metadata.subscriptionId to subscription upgrade', async () => {
      const e = event('payment_intent.succeeded', {
        metadata: { type: 'subscription', subscriptionId: 'sub_1' },
      });

      payments.constructEvent.mockResolvedValue(e);
      await service.execute(raw, 'sig');

      expect(handler.handleSubscriptionUpgrade).toHaveBeenCalledWith(e);
      expect(handler.handleOneTimePurchase).not.toHaveBeenCalled();
    });

    it.each([{ type: 'subscription' }, {}, undefined])(
      'ignores payment_intent.succeeded of a subscription invoice (metadata %j): invoice.paid records it',
      async (metadata) => {
        payments.constructEvent.mockResolvedValue(
          event('payment_intent.succeeded', { metadata }),
        );

        await expect(service.execute(raw, 'sig')).resolves.toBeUndefined();
        expect(redis.set).not.toHaveBeenCalled();
        Object.values(handler).forEach((h) => expect(h).not.toHaveBeenCalled());
      },
    );

    it.each(['customer.subscription.updated', 'customer.subscription.deleted'])(
      'routes %s to the subscription sync handler',
      async (type) => {
        const e = event(type);

        payments.constructEvent.mockResolvedValue(e);
        await service.execute(raw, 'sig');

        expect(handler.handleSubscriptionSync).toHaveBeenCalledWith(e);
      },
    );

    it('acknowledges unknown event types without claiming or enqueueing', async () => {
      payments.constructEvent.mockResolvedValue(event('customer.created'));

      await expect(service.execute(raw, 'sig')).resolves.toBeUndefined();
      expect(redis.set).not.toHaveBeenCalled();
      Object.values(handler).forEach((h) => expect(h).not.toHaveBeenCalled());
    });
  });

  describe('idempotency by event.id', () => {
    it('claims the event with SET NX and a 7 day TTL before enqueueing', async () => {
      payments.constructEvent.mockResolvedValue(event('invoice.paid'));

      await service.execute(raw, 'sig');

      expect(redis.set).toHaveBeenCalledWith(
        'stripe-webhook-event:evt_1',
        '1',
        'EX',
        WEBHOOK_EVENT_TTL_SECONDS,
        'NX',
      );
      expect(WEBHOOK_EVENT_TTL_SECONDS).toBe(7 * 24 * 3600);
    });

    it('a replay of an already claimed event.id is acknowledged and not enqueued again', async () => {
      payments.constructEvent.mockResolvedValue(event('invoice.paid'));
      redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

      await service.execute(raw, 'sig');
      await service.execute(raw, 'sig');

      expect(handler.handleSubscriptionPurchase).toHaveBeenCalledTimes(1);
    });

    it('different event ids are independent', async () => {
      payments.constructEvent
        .mockResolvedValueOnce(event('invoice.paid', {}, 'evt_a'))
        .mockResolvedValueOnce(event('invoice.paid', {}, 'evt_b'));

      await service.execute(raw, 'sig');
      await service.execute(raw, 'sig');

      expect(handler.handleSubscriptionPurchase).toHaveBeenCalledTimes(2);
    });

    it('a failed enqueue releases the claim and propagates, so Stripe retries the delivery', async () => {
      payments.constructEvent.mockResolvedValue(event('invoice.paid'));
      handler.handleSubscriptionPurchase.mockRejectedValue(new Error('queue'));

      await expect(service.execute(raw, 'sig')).rejects.toThrow('queue');
      expect(redis.del).toHaveBeenCalledWith('stripe-webhook-event:evt_1');
    });

    it('Redis failure on the claim propagates (5xx) and enqueues nothing', async () => {
      payments.constructEvent.mockResolvedValue(event('invoice.paid'));
      redis.set.mockRejectedValue(new Error('redis down'));

      await expect(service.execute(raw, 'sig')).rejects.toThrow('redis down');
      expect(handler.handleSubscriptionPurchase).not.toHaveBeenCalled();
    });
  });
});
