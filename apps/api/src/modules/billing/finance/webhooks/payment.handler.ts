import { Injectable } from '@nestjs/common';

import type { StripeTypes } from '../../payments';
// import { QUEUE, QUEUE_JOB } from 'config/queue.config';
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';

@Injectable()
export class PaymentHandler {
  constructor() {
    // @InjectQueue(QUEUE.PaymentQueue) private readonly paymentQueue: Queue,
  }

  handleSubscriptionPurchase(_event: StripeTypes.Event): Promise<void> {
    // await this.paymentQueue.add(
    //   QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionPurchase,
    //   event.data.object,
    //   {
    //     attempts: 1,
    //     backoff: { type: 'exponential', delay: 5000 },
    //   },
    // );
    return Promise.resolve();
  }

  handleSubscriptionUpgrade(_event: StripeTypes.Event): Promise<void> {
    // await this.paymentQueue.add(
    //   QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionUpgrade,
    //   event.data.object,
    //   {
    //     attempts: 1,
    //     backoff: { type: 'exponential', delay: 5000 },
    //   },
    // );
    return Promise.resolve();
  }

  handleOneTimePurchase(_event: StripeTypes.Event): Promise<void> {
    // await this.paymentQueue.add(
    //   QUEUE_JOB[QUEUE.PaymentQueue].OneTimePurchase,
    //   event.data.object,
    //   {
    //     attempts: 1,
    //     backoff: { type: 'exponential', delay: 5000 },
    //   },
    // );
    return Promise.resolve();
  }
}
