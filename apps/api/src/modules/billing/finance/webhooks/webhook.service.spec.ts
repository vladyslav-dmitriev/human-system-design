import { BadRequestException } from '@nestjs/common';

import { WebhookService } from './webhook.service';

jest.mock('./payment.handler', () => ({ PaymentHandler: class {} }));
jest.mock('../../payments', () => ({ PaymentsService: class {} }));

describe('WebhookService', () => {
  const handler = {
    handleSubscriptionPurchase: jest.fn(),
    handleSubscriptionUpgrade: jest.fn(),
    handleOneTimePurchase: jest.fn(),
  };
  const payments = { constructEvent: jest.fn() };
  const service = new WebhookService(handler, payments as never);
  const raw = Buffer.from('{}');

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterAll(() => jest.restoreAllMocks());

  it('rejects an invalid signature with 400 and runs no handler', async () => {
    payments.constructEvent.mockRejectedValue(new Error('bad signature'));

    await expect(service.execute(raw, 'sig')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(payments.constructEvent).toHaveBeenCalledWith(raw, 'sig');
    Object.values(handler).forEach((h) => expect(h).not.toHaveBeenCalled());
  });

  it('turns a synchronous constructEvent throw (missing secret) into 400', async () => {
    payments.constructEvent.mockImplementation(() => {
      throw new Error('STRIPE_WEBHOOK_SECRET is missing');
    });

    await expect(service.execute(raw, 'sig')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('routes invoice.paid to the subscription purchase handler', async () => {
    const event = { type: 'invoice.paid', data: { object: {} } };

    payments.constructEvent.mockResolvedValue(event);
    await service.execute(raw, 'sig');

    expect(handler.handleSubscriptionPurchase).toHaveBeenCalledWith(event);
    expect(handler.handleOneTimePurchase).not.toHaveBeenCalled();
  });

  it('routes payment_intent.succeeded with metadata.type=one_time to one-time purchase', async () => {
    const event = {
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { type: 'one_time' } } },
    };

    payments.constructEvent.mockResolvedValue(event);
    await service.execute(raw, 'sig');

    expect(handler.handleOneTimePurchase).toHaveBeenCalledWith(event);
    expect(handler.handleSubscriptionUpgrade).not.toHaveBeenCalled();
  });

  it.each([{ type: 'subscription' }, {}, undefined])(
    'routes payment_intent.succeeded with metadata %j to subscription upgrade',
    async (metadata) => {
      const event = {
        type: 'payment_intent.succeeded',
        data: { object: { metadata } },
      };

      payments.constructEvent.mockResolvedValue(event);
      await service.execute(raw, 'sig');

      expect(handler.handleSubscriptionUpgrade).toHaveBeenCalledWith(event);
      expect(handler.handleOneTimePurchase).not.toHaveBeenCalled();
    },
  );

  it('ignores unknown event types without error', async () => {
    payments.constructEvent.mockResolvedValue({
      type: 'customer.created',
      data: { object: {} },
    });

    await expect(service.execute(raw, 'sig')).resolves.toBeUndefined();
    Object.values(handler).forEach((h) => expect(h).not.toHaveBeenCalled());
  });

  it('propagates handler errors so Stripe retries the delivery', async () => {
    payments.constructEvent.mockResolvedValue({
      type: 'invoice.paid',
      data: { object: {} },
    });
    handler.handleSubscriptionPurchase.mockRejectedValue(new Error('queue'));

    await expect(service.execute(raw, 'sig')).rejects.toThrow('queue');
  });
});
