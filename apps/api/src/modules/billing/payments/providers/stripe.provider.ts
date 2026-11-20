import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { StripeTypes } from '../stripe.types';

import { IPaymentProvider } from '../payments.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly stripe: Stripe.Stripe;

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

  constructEvent(rawBody: string | Buffer, signature: string) {
    const stripeWebhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is missing');
    }

    return this.stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      stripeWebhookSecret,
    );
  }

  createPaymentCustomer(email: string) {
    return this.stripe.customers.create({
      email,
    });
  }

  createPaymentIntent({
    stripeCustomerId,
    amount,
    currency,
    metadata,
  }: {
    stripeCustomerId: string;
    amount: number;
    currency: string;
    metadata: StripeTypes.MetadataParam;
  }) {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      setup_future_usage: 'off_session',
      metadata,
    });
  }

  getPaymentMethods(stripeCustomerId: string) {
    return this.stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });
  }

  addPaymentMethod(stripeCustomerId: string, paymentMethodId: string) {
    return this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });
  }

  updateDefaultPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ) {
    return this.stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  deletePaymentMethod(_stripeCustomerId: string, paymentMethodId: string) {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  getPrice(priceId: string) {
    return this.stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });
  }

  createSubscription(
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

  getPaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  createBillingPortal(stripeCustomerId: string, frontendUrl: string) {
    return this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });
  }

  updateSubscription(stripeSubscriptionId: string, autoRenew: boolean) {
    return this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: !autoRenew,
    });
  }

  getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  createPaymentInvoicePreview(
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

  getPricesList() {
    return this.stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    });
  }
}
