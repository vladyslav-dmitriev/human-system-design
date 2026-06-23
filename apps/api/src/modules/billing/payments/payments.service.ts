import { Inject, Injectable } from '@nestjs/common';

import type { IPaymentProvider } from './payments.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('PAYMENT_PROVIDER') private readonly provider: IPaymentProvider,
  ) {}

  async constructEvent(rawBody: Buffer, signature: string) {
    return this.provider.constructEvent(rawBody, signature);
  }

  async createPaymentCustomer(email: string) {
    return this.provider.createPaymentCustomer(email);
  }

  async createPaymentIntent({
    stripeCustomerId,
    amount,
    currency,
    metadata,
  }: {
    stripeCustomerId: string;
    amount: number;
    currency: string;
    metadata: any;
  }) {
    return this.provider.createPaymentIntent({
      stripeCustomerId,
      amount,
      currency,
      metadata,
    });
  }

  async getPaymentMethods(stripeCustomerId: string) {
    return this.provider.getPaymentMethods(stripeCustomerId);
  }

  async addPaymentMethod(stripeCustomerId: string, paymentMethodId: string) {
    return this.provider.addPaymentMethod(stripeCustomerId, paymentMethodId);
  }

  async updateDefaultPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ) {
    return this.provider.updateDefaultPaymentMethod(
      stripeCustomerId,
      paymentMethodId,
    );
  }

  async deletePaymentMethod(stripeCustomerId: string, paymentMethodId: string) {
    return this.provider.deletePaymentMethod(stripeCustomerId, paymentMethodId);
  }

  async getPrice(priceId: string) {
    return this.provider.getPrice(priceId);
  }

  async createSubscription(
    stripeCustomerId: string,
    priceId: string,
    productName: string,
  ) {
    return this.provider.createSubscription(
      stripeCustomerId,
      priceId,
      productName,
    );
  }

  async getPaymentIntent(paymentIntentId: string) {
    return this.provider.getPaymentIntent(paymentIntentId);
  }

  async createBillingPortal(stripeCustomerId: string, frontendUrl: string) {
    return this.provider.createBillingPortal(stripeCustomerId, frontendUrl);
  }

  async updateSubscription(stripeSubscriptionId: string, autoRenew: boolean) {
    return this.provider.updateSubscription(stripeSubscriptionId, autoRenew);
  }

  async getSubscription(subscriptionId: string) {
    return this.provider.getSubscription(subscriptionId);
  }

  async createPaymentInvoicePreview(
    stripeCustomerId: string,
    subscriptionId: string,
    newPriceId: string,
    id: string,
  ) {
    return this.provider.createPaymentInvoicePreview(
      stripeCustomerId,
      subscriptionId,
      newPriceId,
      id,
    );
  }

  async getPricesList() {
    return this.provider.getPricesList();
  }
}
