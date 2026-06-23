import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { IPaymentProvider } from '../payments.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private stripe: any;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is missing');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2026-05-27.dahlia',
    });
  }

  async constructEvent(rawBody: any, signature: string) {
    const stripeWebhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is missing');
    }

    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    );
  }

  async createPaymentCustomer(email: string) {
    return this.stripe.customers.create({
      email,
    });
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
  }): Promise<any> {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      setup_future_usage: 'off_session',
      metadata,
    });
  }

  async getPaymentMethods(stripeCustomerId: string) {
    return this.stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });
  }

  async addPaymentMethod(stripeCustomerId: string, paymentMethodId: string) {
    return this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });
  }

  async updateDefaultPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ) {
    return this.stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  async deletePaymentMethod(
    _stripeCustomerId: string,
    paymentMethodId: string,
  ) {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async getPrice(priceId: string) {
    return this.stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });
  }

  async createSubscription(
    stripeCustomerId: string,
    priceId: string,
    productName: string,
  ) {
    return this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.confirmation_secret'],
      metadata: {
        type: 'subscription',
        productName,
      },
    });
  }

  async getPaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async createBillingPortal(stripeCustomerId: string, frontendUrl: string) {
    return this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });
  }

  async updateSubscription(stripeSubscriptionId: string, autoRenew: boolean) {
    return this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: !autoRenew,
    });
  }

  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async createPaymentInvoicePreview(
    stripeCustomerId: string,
    subscriptionId: string,
    newPriceId: string,
    id: string,
  ) {
    return this.stripe.invoices.createPreview({
      customer: stripeCustomerId,
      subscription: subscriptionId,
      subscription_details: {
        items: [
          {
            id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'always_invoice',
      },
    });
  }

  async getPricesList() {
    return this.stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    });
  }
}
