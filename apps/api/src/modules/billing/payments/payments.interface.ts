import type { StripeTypes as Stripe } from './stripe.types';

/**
 * Контракт платёжного провайдера. Сейчас единственная реализация —
 * StripeProvider, поэтому типы ответов совпадают с типами Stripe SDK.
 */
export interface IPaymentProvider {
  constructEvent(
    rawBody: string | Buffer,
    signature: string,
  ): Promise<Stripe.Event>;
  createPaymentCustomer(email: string): Promise<Stripe.Customer>;
  createPaymentIntent(data: {
    stripeCustomerId: string;
    amount: number;
    currency: string;
    metadata: Stripe.MetadataParam;
  }): Promise<Stripe.PaymentIntent>;
  getPaymentMethods(
    stripeCustomerId: string,
  ): Promise<Stripe.ApiList<Stripe.PaymentMethod>>;
  addPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod>;
  updateDefaultPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer>;
  deletePaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod>;
  getPrice(priceId: string): Promise<Stripe.Price>;
  createSubscription(
    stripeCustomerId: string,
    priceId: string,
    productName: string,
  ): Promise<Stripe.Subscription>;
  getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;
  createBillingPortal(
    stripeCustomerId: string,
    frontendUrl: string,
  ): Promise<Stripe.BillingPortal.Session>;
  updateSubscription(
    stripeSubscriptionId: string,
    autoRenew: boolean,
  ): Promise<Stripe.Subscription>;
  getSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
  createPaymentInvoicePreview(
    stripeCustomerId: string,
    subscriptionId: string,
    newPriceId: string,
    id: string,
  ): Promise<Stripe.Invoice>;
  getPricesList(): Promise<Stripe.ApiList<Stripe.Price>>;
}
