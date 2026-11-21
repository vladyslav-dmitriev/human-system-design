import { PaymentProcessor } from './payment.processes';

jest.mock('@nestjs/bullmq', () => ({
  WorkerHost: class WorkerHost {},
}));
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
  const invoiceService = { createInvoice: jest.fn() };
  const featureRepository = { createUserFeature: jest.fn() };

  let processor: PaymentProcessor;

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
    );
  });

  describe('process', () => {
    it('rejects unknown jobs', async () => {
      await expect(processor.process({ name: 'x' } as never)).rejects.toThrow(
        'Unknown job: x',
      );
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
      userRepository.updateBillingSubscription.mockRejectedValue(
        new Error('db'),
      );

      await expect(
        processor.handleSubscriptionUpgrade(intent as never),
      ).rejects.toThrow('Error updating user subscription in database');
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

    it('grants nothing for an unknown customer', async () => {
      userRepository.getUserByStripeCustomerId.mockResolvedValue(null);

      await expect(
        processor.handleOneTimePurchase(intent as never),
      ).rejects.toThrow('User not found');
      expect(featureRepository.createUserFeature).not.toHaveBeenCalled();
    });
  });
});
