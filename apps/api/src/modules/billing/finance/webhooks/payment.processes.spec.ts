import { PaymentProcessor } from './payment.processes';

jest.mock('@nestjs/bullmq', () => ({
  WorkerHost: class WorkerHost {},
  Processor: () => () => undefined,
  OnWorkerEvent: () => () => undefined,
}));
jest.mock('../../../redis', () => ({ REDIS_CLIENT: 'REDIS_CLIENT' }));
jest.mock('../../payment-method', () => ({ PaymentMethodService: class {} }));
jest.mock('../../payments', () => ({ PaymentsService: class {} }));
jest.mock('../../invoice', () => ({ InvoiceService: class {} }));
jest.mock('../../../user', () => ({ UserRepository: class {} }));
jest.mock('../../feature', () => ({ FeatureRepository: class {} }));

describe('PaymentProcessor', () => {
  const userRepository = {
    getUserByStripeCustomerId: jest.fn(),
    updateBillingSubscription: jest.fn(),
  };
  const paymentsService = { getSubscription: jest.fn() };
  const paymentMethodService = { updateDefaultPaymentMethod: jest.fn() };
  const invoiceService = {
    createInvoice: jest.fn(),
    hasInvoiceForPayment: jest.fn(),
  };
  const redis = { del: jest.fn() };
  const featureRepository = {
    createUserFeature: jest.fn(),
    hasUserFeature: jest.fn(),
  };

  let processor: PaymentProcessor;

  const syncFixture = {
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    cancel_at_period_end: false,
    items: {
      data: [{ price: { id: 'price_1' }, current_period_end: 1_800_000_000 }],
    },
  };

  const billingUser = {
    userId: 'u1',
    stripeCustomerId: 'cus_1',
    defaultPaymentMethodId: 'pm_old',
    user: { email: 'a@test.dev' },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    processor = new PaymentProcessor(
      userRepository as never,
      paymentsService as never,
      paymentMethodService as never,
      invoiceService as never,
      featureRepository as never,
      redis as never,
    );
    redis.del.mockResolvedValue(1);
    // по умолчанию getSubscription отдаёт то же, что пришло в событии (см. handleSubscriptionSync)
    paymentsService.getSubscription.mockImplementation((id: string) =>
      Promise.resolve(syncFixture.id === id ? syncFixture : undefined),
    );
  });

  describe('process', () => {
    const job = (name: string, object: unknown = {}) =>
      ({ name, data: { eventId: 'evt_1', object } }) as never;

    it('rejects unknown jobs', async () => {
      await expect(processor.process(job('x'))).rejects.toThrow(
        'Unknown job: x',
      );
    });

    it.each([
      ['subscription-purchase', 'handleSubscriptionPurchase'],
      ['subscription-upgrade', 'handleSubscriptionUpgrade'],
      ['subscription-sync', 'handleSubscriptionSync'],
      ['one-time-purchase', 'handleOneTimePurchase'],
    ] as const)(
      'dispatches %s to %s with the event object',
      async (name, method) => {
        const spy = jest.spyOn(processor, method).mockResolvedValue(undefined);
        const object = { id: 'obj_1' };

        await processor.process(job(name, object));

        expect(spy).toHaveBeenCalledWith(object);
      },
    );
  });

  describe('onFailed (retries exhausted)', () => {
    const remove = jest.fn();

    beforeEach(() => {
      remove.mockReset().mockResolvedValue(undefined);
    });

    const failedJob = (attemptsMade: number) =>
      ({
        remove,
        id: 'evt_1',
        name: 'one-time-purchase',
        attemptsMade,
        opts: { attempts: 5 },
        data: { eventId: 'evt_1', object: {} },
      }) as never;

    it('keeps the idempotency key while retries remain', async () => {
      await processor.onFailed(failedJob(2), new Error('db'));

      expect(redis.del).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });

    it('releases the idempotency key after the last attempt so a manual Stripe resend is processed', async () => {
      await processor.onFailed(failedJob(5), new Error('db'));

      expect(redis.del).toHaveBeenCalledWith('stripe-webhook-event:evt_1');
    });

    it('removes the exhausted job so queue.add(jobId = event.id) is not dropped as a duplicate', async () => {
      await processor.onFailed(failedJob(5), new Error('db'));

      expect(remove).toHaveBeenCalledTimes(1);
    });

    it('still releases the key when job.remove() fails', async () => {
      remove.mockRejectedValue(new Error('locked'));

      await processor.onFailed(failedJob(5), new Error('db'));

      expect(redis.del).toHaveBeenCalledWith('stripe-webhook-event:evt_1');
    });

    it('does not throw when the job is unknown or Redis fails', async () => {
      redis.del.mockRejectedValue(new Error('redis'));

      await expect(
        processor.onFailed(undefined, new Error('x')),
      ).resolves.toBeUndefined();
      await expect(
        processor.onFailed(failedJob(5), new Error('x')),
      ).resolves.toBeUndefined();
    });
  });

  describe('redelivery of an already processed payment (idempotency)', () => {
    beforeEach(() => {
      invoiceService.hasInvoiceForPayment.mockResolvedValue(true);
    });

    it('purchase: no second subscription write and no second invoice', async () => {
      await processor.handleSubscriptionPurchase({ id: 'in_1' } as never);

      expect(invoiceService.hasInvoiceForPayment).toHaveBeenCalledWith('in_1');
      expect(userRepository.updateBillingSubscription).not.toHaveBeenCalled();
      expect(invoiceService.createInvoice).not.toHaveBeenCalled();
    });

    it('upgrade: nothing is written twice', async () => {
      await processor.handleSubscriptionUpgrade({ id: 'pi_1' } as never);

      expect(userRepository.updateBillingSubscription).not.toHaveBeenCalled();
      expect(invoiceService.createInvoice).not.toHaveBeenCalled();
    });

    it('one-time: no second feature and no second invoice', async () => {
      await processor.handleOneTimePurchase({ id: 'pi_2' } as never);

      expect(featureRepository.createUserFeature).not.toHaveBeenCalled();
      expect(invoiceService.createInvoice).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionSync', () => {
    const subscription = syncFixture;
    /** Stripe отдаёт актуальную подписку; событие несёт (возможно устаревший) снимок. */
    const stripeHas = (overrides: Record<string, unknown> = {}) =>
      paymentsService.getSubscription.mockResolvedValue({
        ...subscription,
        ...overrides,
      });

    it('writes the current subscription state', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);

      await processor.handleSubscriptionSync(subscription as never);

      expect(paymentsService.getSubscription).toHaveBeenCalledWith('sub_1');
      expect(userRepository.updateBillingSubscription).toHaveBeenCalledWith({
        userId: 'u1',
        stripeSubscriptionId: 'sub_1',
        stripePriceId: 'price_1',
        status: 'active',
        autoRenew: true,
        currentPeriodEnd: new Date(1_800_000_000 * 1000),
      });
    });

    it('a stale event does not overwrite a newer state: the fresh subscription from Stripe wins', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      // событие "updated" (active) пришло после "deleted": в Stripe подписка уже отменена
      stripeHas({ status: 'canceled' });

      await processor.handleSubscriptionSync(subscription as never);

      expect(
        userRepository.updateBillingSubscription.mock.calls[0][0],
      ).toMatchObject({ status: 'canceled', autoRenew: false });
    });

    it('cancel_at_period_end switches auto renew off', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      stripeHas({ cancel_at_period_end: true });

      await processor.handleSubscriptionSync(subscription as never);

      expect(
        userRepository.updateBillingSubscription.mock.calls[0][0].autoRenew,
      ).toBe(false);
    });

    it('a canceled subscription is stored as canceled without auto renew', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      stripeHas({ status: 'canceled' });

      await processor.handleSubscriptionSync(subscription as never);

      expect(
        userRepository.updateBillingSubscription.mock.calls[0][0],
      ).toMatchObject({ status: 'canceled', autoRenew: false });
    });

    it('accepts an expanded customer object', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      stripeHas({ customer: { id: 'cus_1' } });

      await processor.handleSubscriptionSync(subscription as never);

      expect(userRepository.getUserByStripeCustomerId).toHaveBeenCalledWith(
        'cus_1',
      );
    });

    it('fails for an unknown customer and writes nothing', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(null);

      await expect(
        processor.handleSubscriptionSync(subscription as never),
      ).rejects.toThrow('User not found');
      expect(userRepository.updateBillingSubscription).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionPurchase', () => {
    const invoice = {
      id: 'in_1',
      customer: 'cus_1',
      customer_email: 'a@test.dev',
      total: 999,
      currency: 'usd',
      metadata: {},
      parent: { subscription_details: { subscription: 'sub_1' } },
    };

    it('updates the subscription and creates an invoice for the owner', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      paymentsService.getSubscription.mockResolvedValue({
        status: 'active',
        items: {
          data: [
            { price: { id: 'price_1' }, current_period_end: 1_800_000_000 },
          ],
        },
      });

      await processor.handleSubscriptionPurchase(invoice as never);

      expect(userRepository.updateBillingSubscription).toHaveBeenCalledWith({
        userId: 'u1',
        stripeSubscriptionId: 'sub_1',
        stripePriceId: 'price_1',
        status: 'active',
        autoRenew: true,
        currentPeriodEnd: new Date(1_800_000_000 * 1000),
      });
      expect(invoiceService.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          stripePaymentIntentId: 'in_1',
          amount: 999,
          currency: 'usd',
        }),
      );
    });

    it('fails and writes nothing for an unknown Stripe customer', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(null);

      await expect(
        processor.handleSubscriptionPurchase(invoice as never),
      ).rejects.toThrow('User not found');
      expect(invoiceService.createInvoice).not.toHaveBeenCalled();
    });

    it('fails when the invoice has no subscription id', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);

      await expect(
        processor.handleSubscriptionPurchase({
          ...invoice,
          parent: null,
        } as never),
      ).rejects.toThrow('Subscription ID not found in invoice');
      expect(userRepository.updateBillingSubscription).not.toHaveBeenCalled();
    });

    it('stores a null period end when Stripe sends none', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      paymentsService.getSubscription.mockResolvedValue({
        status: 'active',
        items: { data: [{ price: { id: 'p' } }] },
      });

      await processor.handleSubscriptionPurchase(invoice as never);

      expect(
        userRepository.updateBillingSubscription.mock.calls[0][0]
          .currentPeriodEnd,
      ).toBeNull();
    });
  });

  describe('handleSubscriptionUpgrade', () => {
    const intent = {
      id: 'pi_1',
      customer: 'cus_1',
      amount: 500,
      currency: 'usd',
      metadata: { subscriptionId: 'sub_1', priceId: 'price_2' },
    };

    it('applies the new price and records the invoice', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      paymentsService.getSubscription.mockResolvedValue({
        status: 'active',
        items: { data: [{ current_period_end: 1_800_000_000 }] },
      });

      await processor.handleSubscriptionUpgrade(intent as never);

      expect(userRepository.updateBillingSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          stripeSubscriptionId: 'sub_1',
          stripePriceId: 'price_2',
        }),
      );
      expect(invoiceService.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          stripePaymentIntentId: 'pi_1',
          customerEmail: 'a@test.dev',
        }),
      );
    });

    it('fails without subscriptionId in metadata, before any lookup', async () => {
      await expect(
        processor.handleSubscriptionUpgrade({
          ...intent,
          metadata: {},
        } as never),
      ).rejects.toThrow('Subscription ID not found in payment intent metadata');
      expect(userRepository.getUserByStripeCustomerId).not.toHaveBeenCalled();
    });

    it('fails for an unknown customer', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(null);

      await expect(
        processor.handleSubscriptionUpgrade(intent as never),
      ).rejects.toThrow('User not found');
    });

    it('wraps DB failures into a single error', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      paymentsService.getSubscription.mockResolvedValue({
        status: 'active',
        items: { data: [{}] },
      });
      const dbError = new Error('db');

      userRepository.updateBillingSubscription.mockRejectedValue(dbError);

      const error = await processor
        .handleSubscriptionUpgrade(intent as never)
        .catch((e: unknown) => e as Error & { cause?: unknown });

      expect(error).toMatchObject({
        message: 'Error updating user subscription in database',
      });
      // исходная причина не теряется
      expect((error as { cause?: unknown }).cause).toBe(dbError);
      expect(invoiceService.createInvoice).not.toHaveBeenCalled();
    });
  });

  describe('handleOneTimePurchase', () => {
    const intent = {
      id: 'pi_2',
      customer: 'cus_1',
      payment_method: 'pm_new',
      amount: 100,
      currency: 'usd',
      metadata: { priceId: 'price_x', type: 'one_time' },
    };

    it('grants the feature, switches the default card and records the invoice', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);

      await processor.handleOneTimePurchase(intent as never);

      expect(featureRepository.createUserFeature).toHaveBeenCalledWith(
        'u1',
        'price_x',
      );
      expect(
        paymentMethodService.updateDefaultPaymentMethod,
      ).toHaveBeenCalledWith('u1', 'cus_1', 'pm_new');
      expect(invoiceService.createInvoice).toHaveBeenCalledTimes(1);
    });

    it('does not touch the default card when it is unchanged', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue({
        ...billingUser,
        defaultPaymentMethodId: 'pm_new',
      });

      await processor.handleOneTimePurchase(intent as never);

      expect(
        paymentMethodService.updateDefaultPaymentMethod,
      ).not.toHaveBeenCalled();
    });

    it('a retry after a partial failure does not create a second UserFeature', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(billingUser);
      featureRepository.hasUserFeature.mockResolvedValue(false);
      // 1-я попытка: фича создана, затем падает смена карты
      paymentMethodService.updateDefaultPaymentMethod.mockRejectedValueOnce(
        new Error('stripe'),
      );

      await expect(
        processor.handleOneTimePurchase(intent as never),
      ).rejects.toThrow('stripe');
      expect(featureRepository.createUserFeature).toHaveBeenCalledTimes(1);

      // ретрай: фича уже есть
      featureRepository.hasUserFeature.mockResolvedValue(true);
      await processor.handleOneTimePurchase(intent as never);

      expect(featureRepository.hasUserFeature).toHaveBeenCalledWith(
        'u1',
        'price_x',
      );
      expect(featureRepository.createUserFeature).toHaveBeenCalledTimes(1);
      expect(invoiceService.createInvoice).toHaveBeenCalledTimes(1);
    });

    it('grants nothing for an unknown customer', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(null);

      await expect(
        processor.handleOneTimePurchase(intent as never),
      ).rejects.toThrow('User not found');
      expect(featureRepository.createUserFeature).not.toHaveBeenCalled();
    });
  });
});
