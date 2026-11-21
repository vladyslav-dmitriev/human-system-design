import { BadRequestException, NotFoundException } from '@nestjs/common';

import { SubscriptionService } from './subscription.service';

jest.mock('../../user', () => ({ UserRepository: class {} }));
jest.mock('../payments', () => ({ PaymentsService: class {} }));
jest.mock('./subscription.repository', () => ({
  SubscriptionRepository: class {},
}));

describe('SubscriptionService', () => {
  const users = { getUserById: jest.fn() };
  const payments = {
    updateSubscription: jest.fn(),
    getSubscription: jest.fn(),
    getPrice: jest.fn(),
    createPaymentInvoicePreview: jest.fn(),
    createPaymentIntent: jest.fn(),
  };
  const repo = { changeAutoRenew: jest.fn(), isPriceAllowed: jest.fn() };
  const service = new SubscriptionService(
    users as never,
    payments as never,
    repo as never,
  );

  beforeEach(() => jest.resetAllMocks());

  describe('setAutoRenew', () => {
    it('updates Stripe and the DB for the caller own subscription', async () => {
      users.getUserById.mockResolvedValue({
        subscription: { stripeSubscriptionId: 'sub_1' },
      });

      await expect(
        service.setAutoRenew('u1', { autoRenew: false }),
      ).resolves.toEqual({ success: true, autoRenew: false });
      expect(users.getUserById).toHaveBeenCalledWith('u1');
      expect(payments.updateSubscription).toHaveBeenCalledWith('sub_1', false);
      expect(repo.changeAutoRenew).toHaveBeenCalledWith('sub_1', false);
    });

    it('throws NotFound without a subscription and calls nothing external', async () => {
      users.getUserById.mockResolvedValue({
        subscription: { stripeSubscriptionId: null },
      });

      await expect(
        service.setAutoRenew('u1', { autoRenew: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(payments.updateSubscription).not.toHaveBeenCalled();
    });

    it('does not update the DB when Stripe fails', async () => {
      users.getUserById.mockResolvedValue({
        subscription: { stripeSubscriptionId: 'sub_1' },
      });
      payments.updateSubscription.mockRejectedValue(new Error('stripe'));

      await expect(
        service.setAutoRenew('u1', { autoRenew: true }),
      ).rejects.toThrow('stripe');
      expect(repo.changeAutoRenew).not.toHaveBeenCalled();
    });
  });

  describe('upgradeSubscription', () => {
    const setup = () => {
      users.getUserById.mockResolvedValue({
        subscription: { stripeSubscriptionId: 'sub_1' },
      });
      payments.getSubscription.mockResolvedValue({
        customer: 'cus_1',
        items: { data: [{ id: 'si_1' }] },
      });
      repo.isPriceAllowed.mockResolvedValue(true);
      payments.getPrice.mockResolvedValue({
        active: true,
        type: 'recurring',
        unit_amount: 1000,
        product: { name: 'Pro' },
      });
      payments.createPaymentInvoicePreview.mockResolvedValue({
        amount_due: 700,
        currency: 'usd',
        customer: 'cus_1',
      });
    };

    it('check: returns a preview and creates no payment intent', async () => {
      setup();

      await expect(
        service.upgradeSubscription('u1', {
          type: 'check',
          priceId: 'price_2',
        } as never),
      ).resolves.toEqual({
        clientSecret: null,
        amount: 700,
        currency: 'usd',
        productName: 'Pro',
      });
      expect(payments.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('subscription: creates an intent with metadata used later by the webhook', async () => {
      setup();
      payments.createPaymentIntent.mockResolvedValue({ client_secret: 'cs_1' });

      const result = await service.upgradeSubscription('u1', {
        type: 'subscription',
        priceId: 'price_2',
      } as never);

      expect(result.clientSecret).toBe('cs_1');
      expect(payments.createPaymentIntent).toHaveBeenCalledWith({
        amount: 700,
        currency: 'usd',
        stripeCustomerId: 'cus_1',
        metadata: {
          name: 'Pro',
          type: 'subscription',
          subscriptionId: 'sub_1',
          priceId: 'price_2',
        },
      });
    });

    it.each([
      [
        'price is not in the allowlist',
        () => repo.isPriceAllowed.mockResolvedValue(false),
      ],
      [
        'price is inactive in Stripe',
        () =>
          payments.getPrice.mockResolvedValue({
            active: false,
            type: 'recurring',
            unit_amount: 1,
            product: { name: 'x' },
          }),
      ],
      [
        'price is one-time, not recurring',
        () =>
          payments.getPrice.mockResolvedValue({
            active: true,
            type: 'one_time',
            unit_amount: 1,
            product: { name: 'x' },
          }),
      ],
      [
        'Stripe cannot find the price',
        () => payments.getPrice.mockRejectedValue(new Error('no such price')),
      ],
    ])(
      'rejects with 400 when %s: no preview and no payment intent',
      async (_name, arrange) => {
        setup();
        arrange();

        for (const type of ['check', 'subscription']) {
          await expect(
            service.upgradeSubscription('u1', {
              type,
              priceId: 'price_evil',
            } as never),
          ).rejects.toBeInstanceOf(BadRequestException);
        }
        expect(payments.createPaymentInvoicePreview).not.toHaveBeenCalled();
        expect(payments.createPaymentIntent).not.toHaveBeenCalled();
      },
    );

    it('checks the allowlist with the priceId from the request', async () => {
      setup();

      await service.upgradeSubscription('u1', {
        type: 'check',
        priceId: 'price_2',
      } as never);

      expect(repo.isPriceAllowed).toHaveBeenCalledWith('price_2');
    });

    it('throws NotFound for an unknown user and for a user without subscription', async () => {
      users.getUserById.mockResolvedValueOnce(null);
      await expect(
        service.upgradeSubscription('u1', {
          type: 'check',
          priceId: 'p',
        } as never),
      ).rejects.toBeInstanceOf(NotFoundException);

      users.getUserById.mockResolvedValueOnce({
        subscription: { stripeSubscriptionId: null },
      });
      await expect(
        service.upgradeSubscription('u1', {
          type: 'check',
          priceId: 'p',
        } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(payments.getPrice).not.toHaveBeenCalled();
    });
  });
});
