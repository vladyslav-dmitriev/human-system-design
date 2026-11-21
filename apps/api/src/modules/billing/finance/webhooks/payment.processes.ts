import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type Redis from 'ioredis';

import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import { PaymentMethodService } from '../../payment-method';
import { PaymentsService, type StripeTypes } from '../../payments';
import { InvoiceService } from '../../invoice';
import { UserRepository } from '../../../user';
import { FeatureRepository } from '../../feature';
import { REDIS_CLIENT } from '../../../redis';
import { type PaymentJobData, webhookEventKey } from './webhook-idempotency';

@Processor(QUEUE.PaymentQueue)
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(PaymentMethodService)
    private readonly paymentMethodService: PaymentMethodService,
    @Inject(InvoiceService)
    private readonly invoiceService: InvoiceService,
    @Inject(FeatureRepository)
    private readonly featureRepository: FeatureRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super();
  }

  process(job: Job<PaymentJobData>): Promise<void> {
    const jobs = QUEUE_JOB[QUEUE.PaymentQueue];
    const { object } = job.data;

    switch (job.name) {
      case jobs.SubscriptionPurchase:
        return this.handleSubscriptionPurchase(object as StripeTypes.Invoice);

      case jobs.SubscriptionUpgrade:
        return this.handleSubscriptionUpgrade(
          object as StripeTypes.PaymentIntent,
        );

      case jobs.SubscriptionSync:
        return this.handleSubscriptionSync(object as StripeTypes.Subscription);

      case jobs.OneTimePurchase:
        return this.handleOneTimePurchase(object as StripeTypes.PaymentIntent);

      default:
        return Promise.reject(new Error(`Unknown job: ${job.name}`));
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<PaymentJobData> | undefined, error: Error) {
    const attempts = job?.opts.attempts ?? 1;

    this.logger.error(
      `Payment job ${job?.id} (${job?.name}) failed, attempt ${job?.attemptsMade}/${attempts}: ${error.message}`,
    );

    // Задача исчерпала ретраи: освобождаем ключ идемпотентности, чтобы ручная
    // повторная отправка события из дашборда Stripe была обработана.
    if (job && job.attemptsMade >= attempts && job.data?.eventId) {
      this.logger.error(
        `Payment job ${job.id} moved to failed, event ${job.data.eventId} needs manual review`,
      );
      await this.redis
        .del(webhookEventKey(job.data.eventId))
        .catch(() => undefined);
    }
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`Payment worker error: ${error.message}`);
  }

  async handleSubscriptionPurchase(invoice: StripeTypes.Invoice) {
    // Повторная доставка: счёт по этому платежу уже записан
    if (await this.invoiceService.hasInvoiceForPayment(invoice.id)) {
      return;
    }

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
      customerEmail: invoice.customer_email,
      amount: invoice.total,
      currency: invoice.currency,
      metadata: invoice.metadata,
    });
  }

  async handleSubscriptionUpgrade(paymentIntent: StripeTypes.PaymentIntent) {
    if (await this.invoiceService.hasInvoiceForPayment(paymentIntent.id)) {
      return;
    }

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

  async handleSubscriptionSync(subscription: StripeTypes.Subscription) {
    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const user =
      await this.userRepository.getUserByStripeCustomerId(stripeCustomerId);

    if (!user) {
      throw new Error('User not found');
    }

    const item = subscription.items.data[0];

    if (!item) {
      throw new Error('Subscription has no items');
    }

    // Задача по определению идемпотентна: пишем актуальное состояние подписки
    await this.userRepository.updateBillingSubscription({
      userId: user.userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: item.price.id,
      status: subscription.status,
      autoRenew:
        !subscription.cancel_at_period_end &&
        subscription.status !== 'canceled',
      currentPeriodEnd: item.current_period_end
        ? new Date(item.current_period_end * 1000)
        : null,
    });
  }

  async handleOneTimePurchase(paymentIntent: StripeTypes.PaymentIntent) {
    if (await this.invoiceService.hasInvoiceForPayment(paymentIntent.id)) {
      return;
    }

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

    await this.invoiceService.createInvoice({
      userId: user.userId,
      stripeCustomerId,
      stripePaymentIntentId: paymentIntent.id,
      customerEmail: user.user.email,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });
  }
}
