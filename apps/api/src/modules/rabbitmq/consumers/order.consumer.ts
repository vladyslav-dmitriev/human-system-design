import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQConnection } from '../managers/connection.manager';
import { RabbitMQConfig } from '../rabbitmq.config';
import type { ConsumedMessageMetadata } from '../types/rabbitmq.types';

export interface OrderContent {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  status: 'created' | 'paid' | 'shipped' | 'cancelled';
  createdAt: string;
}

/** Сервис, который обрабатывает события заказов (передаётся снаружи) */
export interface OrderEventsHandler {
  processNewOrder(order: OrderContent): Promise<void>;
  processPaidOrder(orderId: string): Promise<void>;
  processShippedOrder(orderId: string): Promise<void>;
  processCancelledOrder(orderId: string): Promise<void>;
}

export class OrderConsumer extends RabbitMQConsumer {
  private readonly orderService: OrderEventsHandler | undefined;

  constructor(
    connection: RabbitMQConnection,
    config: RabbitMQConfig,
    orderService?: OrderEventsHandler,
  ) {
    super(connection, config);
    this.orderService = orderService;
  }

  async registerAll(): Promise<void> {
    await this.register({
      queue: 'order.queue',
      routingKey: 'order.#',
      handler: (content, metadata) =>
        this.handleOrder(content as OrderContent, metadata),
    });
  }

  private async handleOrder(
    content: OrderContent,
    metadata: ConsumedMessageMetadata,
  ): Promise<void> {
    const { routingKey } = metadata;

    this.logger.info(`📦 Обработка заказа: ${routingKey}`, {
      orderId: content.orderId,
      userId: content.userId,
      messageId: metadata.messageId,
    });

    try {
      switch (routingKey) {
        case 'order.created':
          await this.orderService.processNewOrder(content);
          break;

        case 'order.paid':
          await this.orderService.processPaidOrder(content.orderId);
          break;

        case 'order.shipped':
          await this.orderService.processShippedOrder(content.orderId);
          break;

        case 'order.cancelled':
          await this.orderService.processCancelledOrder(content.orderId);
          break;

        default:
          this.logger.warn(`Неизвестный тип заказа: ${routingKey}`);
          throw new Error(`Unknown order type: ${routingKey}`);
      }

      this.logger.info(`✅ Заказ успешно обработан: ${content.orderId}`);
    } catch (error) {
      this.logger.error(`❌ Ошибка обработки заказа:`, error);
      throw error;
    }
  }
}
