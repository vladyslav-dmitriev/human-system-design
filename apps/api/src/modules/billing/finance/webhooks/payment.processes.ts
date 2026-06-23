import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import Stripe from 'stripe';
import { Job } from 'bullmq';

import { QUEUE, QUEUE_JOB } from 'config/queue.config';

import { PaymentMethodService } from '../../payment-method';
import { PaymentsService } from '../../payments';
import { InvoiceService } from '../../invoice';
import { UserRepository } from '../../../user';
import { FeatureRepository } from '../../feature';

@Processor(QUEUE.PaymentQueue)
export class PaymentProcessor extends WorkerHost {
  constructor(
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(PaymentMethodService)
    private readonly paymentMethodService: PaymentMethodService,
    @Inject(InvoiceService)
    private readonly invoiceService: InvoiceService,
    @Inject(FeatureRepository)
    private readonly featureRepository: FeatureRepository,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionPurchase) {
      return this.handleSubscriptionPurchase(job.data as Stripe.Invoice);
    }

    if (job.name === QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionUpgrade) {
      return this.handleSubscriptionUpgrade(job.data as Stripe.PaymentIntent);
    }

    if (job.name === QUEUE_JOB[QUEUE.PaymentQueue].OneTimePurchase) {
      return this.handleOneTimePurchase(job.data as Stripe.PaymentIntent);
    }

    throw new Error(`Unknown job: ${job.name}`);
  }

  async handleSubscriptionPurchase(invoice: Stripe.Invoice) {
    const stripeCustomerId = invoice.customer as string;

    const user =
      await this.userRepository.getUserByStripeCustomerId(stripeCustomerId);

    if (!user) {
      throw new Error('User not found');
    }

    const subscriptionId = invoice.parent?.subscription_details?.subscription;

    if (typeof subscriptionId !== 'string') {
      throw new Error('Subscription ID not found in invoice');
    }

    const subscription =
      await this.paymentsService.getSubscription(subscriptionId);

    const item = subscription.items.data[0];
    const priceId = item.price.id;
    const currentPeriodEnd = item?.current_period_end
      ? new Date(item?.current_period_end * 1000)
      : null;

    await this.userRepository.updateBillingSubscription({
      userId: user.userId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: subscription.status,
      autoRenew: true,
      currentPeriodEnd,
    });

    await this.invoiceService.createInvoice({
      userId: user.userId,
      stripeCustomerId,
      stripePaymentIntentId: invoice.id,
      customerEmail: invoice.customer_email!,
      amount: invoice.total,
      currency: invoice.currency,
      metadata: invoice.metadata,
    });
  }

  async handleSubscriptionUpgrade(paymentIntent: Stripe.PaymentIntent) {
    const stripeCustomerId = paymentIntent.customer as string;
    const subscriptionId = paymentIntent.metadata.subscriptionId;

    if (!subscriptionId) {
      throw new Error('Subscription ID not found in payment intent metadata');
    }

    const user =
      await this.userRepository.getUserByStripeCustomerId(stripeCustomerId);

    if (!user) {
      throw new Error('User not found');
    }

    const subscription =
      await this.paymentsService.getSubscription(subscriptionId);

    const item = subscription.items.data[0];
    const currentPeriodEnd = item?.current_period_end
      ? new Date(item?.current_period_end * 1000)
      : null;

    try {
      await this.userRepository.updateBillingSubscription({
        userId: user.userId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: paymentIntent.metadata.priceId,
        status: subscription.status,
        autoRenew: true,
        currentPeriodEnd,
      });

      await this.invoiceService.createInvoice({
        userId: user.userId,
        stripeCustomerId,
        stripePaymentIntentId: paymentIntent.id,
        customerEmail: user.user.email,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      });
    } catch {
      throw new Error('Error updating user subscription in database');
    }
  }

  async handleOneTimePurchase(paymentIntent: Stripe.PaymentIntent) {
    // return this.prisma.$transaction(async (tx) => {
    // const existingInvoice = await tx.invoice.findUnique({
    //   where: { stripePaymentIntentId: paymentIntent.id },
    // });

    // if (existingInvoice) return;

    const stripeCustomerId = paymentIntent.customer as string;

    const user =
      await this.userRepository.getUserByStripeCustomerId(stripeCustomerId);

    if (!user) {
      throw new Error('User not found');
    }

    const paymentMethodId = paymentIntent.payment_method as string;

    await this.featureRepository.createUserFeature(
      user.userId,
      paymentIntent.metadata.priceId,
    );

    if (user.defaultPaymentMethodId !== paymentMethodId) {
      await this.paymentMethodService.updateDefaultPaymentMethod(
        user.userId,
        user.stripeCustomerId,
        paymentMethodId,
      );
    }

    const paymentMethods = await this.paymentMethodService.getPaymentMethods(
      user.userId,
    );

    //   await tx.invoice.create({ ... });
    await this.invoiceService.createInvoice({
      userId: user.userId,
      stripeCustomerId,
      stripePaymentIntentId: paymentIntent.id,
      customerEmail: user.user.email,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });
    // });
  }
}
