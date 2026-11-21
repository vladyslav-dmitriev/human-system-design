import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type Redis from 'ioredis';

import { PaymentHandler } from './payment.handler';
import { PaymentsService, type StripeTypes } from '../../payments';
import { REDIS_CLIENT } from '../../../redis';
import { ErrorCode } from '../../../../common/errors';
import {
  WEBHOOK_EVENT_TTL_SECONDS,
  webhookEventKey,
} from './webhook-idempotency';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject(PaymentHandler)
    private readonly paymentHandler: PaymentHandler,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Проверяет подпись по raw body и ставит событие в очередь.
   * Дубль `event.id` (Stripe шлёт события повторно) подтверждается без обработки.
   */
  async execute(rawBody: Buffer, signature: string) {
    let event: StripeTypes.Event;

    try {
      event = await this.paymentsService.constructEvent(rawBody, signature);
    } catch (error) {
      // Текст исключения Stripe клиенту не отдаём: только в лог
      this.logger.warn(
        `Stripe webhook rejected: ${error instanceof Error ? error.message : 'invalid signature'}`,
      );
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid webhook signature',
      });
    }

    const enqueue = this.resolveHandler(event);

    if (!enqueue) {
      this.logger.debug(`Stripe event ${event.type} ignored`);

      return;
    }

    // SET NX: первый, кто занял event.id, ставит событие в очередь
    const key = webhookEventKey(event.id);
    const claimed = await this.redis.set(
      key,
      '1',
      'EX',
      WEBHOOK_EVENT_TTL_SECONDS,
      'NX',
    );

    if (claimed === null) {
      this.logger.log(`Stripe event ${event.id} already received, skipped`);

      return;
    }

    try {
      await enqueue();
    } catch (error) {
      // Не поставили в очередь: освобождаем ключ, чтобы повтор от Stripe (5xx) сработал
      await this.redis.del(key).catch(() => undefined);
      throw error;
    }
  }

  private resolveHandler(event: StripeTypes.Event) {
    switch (event.type) {
      case 'invoice.paid':
        return () => this.paymentHandler.handleSubscriptionPurchase(event);

      case 'payment_intent.succeeded': {
        const metadata = event.data.object.metadata;

        if (metadata?.type === 'one_time') {
          return () => this.paymentHandler.handleOneTimePurchase(event);
        }

        // PaymentIntent апгрейда несёт subscriptionId; PI счетов подписок
        // записывает `invoice.paid`, здесь их пропускаем
        return metadata?.subscriptionId
          ? () => this.paymentHandler.handleSubscriptionUpgrade(event)
          : null;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return () => this.paymentHandler.handleSubscriptionSync(event);

      default:
        return null;
    }
  }
}
