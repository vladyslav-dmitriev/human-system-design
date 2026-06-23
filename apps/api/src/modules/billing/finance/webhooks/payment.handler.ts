import { Injectable } from '@nestjs/common';
import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PaymentHandler {
  constructor(
    @InjectQueue(QUEUE.PaymentQueue) private readonly paymentQueue: Queue,
  ) {}

  async handleSubscriptionPurchase(event: any) {
    await this.paymentQueue.add(
      QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionPurchase,
      event.data.object,
      {
        attempts: 1,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async handleSubscriptionUpgrade(event: any) {
    await this.paymentQueue.add(
      QUEUE_JOB[QUEUE.PaymentQueue].SubscriptionUpgrade,
      event.data.object,
      {
        attempts: 1,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async handleOneTimePurchase(event: any) {
    await this.paymentQueue.add(
      QUEUE_JOB[QUEUE.PaymentQueue].OneTimePurchase,
      event.data.object,
      {
        attempts: 1,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
