export interface IPaymentProvider {
  constructEvent(rawBody: any, signature: string): Promise<any>;
  createPaymentCustomer(email: string): Promise<any>;
  createPaymentIntent(data: {
    stripeCustomerId: string;
    amount: number;
    currency: string;
    metadata: object;
  }): Promise<any>;
  getPaymentMethods(stripeCustomerId: string): Promise<any>;
  addPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ): Promise<any>;
  updateDefaultPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ): Promise<any>;
  deletePaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ): Promise<any>;
  getPrice(priceId: string): Promise<any>;
  createSubscription(
    stripeCustomerId: string,
    priceId: string,
    productName: string,
  ): Promise<any>;
  getPaymentIntent(paymentIntentId: string): Promise<any>;
  createBillingPortal(
    stripeCustomerId: string,
    frontendUrl: string,
  ): Promise<any>;
  updateSubscription(
    stripeSubscriptionId: string,
    autoRenew: boolean,
  ): Promise<any>;
  getSubscription(subscriptionId: string): Promise<any>;
  createPaymentInvoicePreview(
    stripeCustomerId: string,
    subscriptionId: string,
    newPriceId: string,
    id: string,
  ): Promise<any>;
  getPricesList(): Promise<any>;
}
