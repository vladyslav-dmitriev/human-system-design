import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQConnection } from '../connection/connection.manager';
import { RabbitMQConfig } from '../rabbitmq.config';
import type { RabbitMQMessage } from '../types/rabbitmq.types';
import type { IRabbitMQSerializer } from '../types/rabbitmq.interfaces';

interface OrderContent {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  status: 'created' | 'paid' | 'shipped' | 'cancelled';
  createdAt: string;
}

export class OrderConsumer extends RabbitMQConsumer {
  private readonly orderService: any; // Ваш сервис заказов

  constructor(
    connection: RabbitMQConnection,
    config: RabbitMQConfig,
    orderService: any,
    serializer?: IRabbitMQSerializer,
  ) {
    super(connection, config, serializer);
    this.orderService = orderService;
  }

  async registerAll(): Promise<void> {
    await this.register({
      queue: 'order.queue',
      routingKey: 'order.*',
      handler: this.handleOrder.bind(this),
    });
  }

  private async handleOrder(
    message: RabbitMQMessage<OrderContent>,
  ): Promise<void> {
    const { routingKey } = message.fields;
    const content = message.content;

    this.logger.info(`📦 Обработка заказа: ${routingKey}`, {
      orderId: content.orderId,
      userId: content.userId,
      messageId: message.properties.messageId,
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
