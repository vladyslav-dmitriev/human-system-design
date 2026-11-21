import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import type { StripeTypes } from '../../payments';
import type { PaymentJobData } from './webhook-idempotency';

/** Кладёт события Stripe в `payment-queue`; саму обработку делает `PaymentProcessor`. */
@Injectable()
export class PaymentHandler {
  constructor(
    @InjectQueue(QUEUE.PaymentQueue)
    private readonly paymentQueue: Queue,
  ) {}

  handleSubscriptionPurchase(event: StripeTypes.Event): Promise<void> {
    return this.enqueue(
      QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionPurchase,
      event,
    );
  }

  handleSubscriptionUpgrade(event: StripeTypes.Event): Promise<void> {
    return this.enqueue(
      QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionUpgrade,
      event,
    );
  }

  handleSubscriptionSync(event: StripeTypes.Event): Promise<void> {
    return this.enqueue(QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionSync, event);
  }

  handleOneTimePurchase(event: StripeTypes.Event): Promise<void> {
    return this.enqueue(QUEUE_JOB[QUEUE.PaymentQueue].OneTimePurchase, event);
  }

  private async enqueue(name: string, event: StripeTypes.Event) {
    const data: PaymentJobData = {
      eventId: event.id,
      object: event.data.object,
    };

    // jobId = event.id: вторая линия защиты от дублей, пока задача ещё в Redis
    await this.paymentQueue.add(name, data, { jobId: event.id });
  }
}
