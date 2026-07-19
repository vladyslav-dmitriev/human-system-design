import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQConnection } from '../managers/connection.manager';
import { RabbitMQConfig } from '../rabbitmq.config';

import type { RabbitMQMessage } from '../types/rabbitmq.types';

interface NotificationContent {
  userId: string;
  title: string;
  body: string;
  type: 'push' | 'sms' | 'in_app';
  data?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  phone?: string;
}

export class NotificationConsumer extends RabbitMQConsumer {
  private readonly notificationService: any;

  constructor(
    connection: RabbitMQConnection,
    config: RabbitMQConfig,
    notificationService: any,
  ) {
    super(connection, config);
    this.notificationService = notificationService;
  }

  async registerAll(): Promise<void> {
    await this.register({
      queue: 'notification.queue',
      routingKey: 'notification.*',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      handler: this.handleNotification.bind(this),
    });
  }

  private async handleNotification(
    message: RabbitMQMessage<NotificationContent>,
  ): Promise<void> {
    const { routingKey } = message.fields;
    const content = message.content;

    this.logger.info(`🔔 Обработка уведомления: ${routingKey}`, {
      userId: content.userId,
      type: content.type,
      messageId: message.properties.messageId,
    });

    try {
      switch (routingKey) {
        case 'notification.push':
          await this.notificationService.sendPushNotification(
            content.userId,
            content.title,
            content.body,
            content.data,
          );
          break;

        case 'notification.sms':
          if (!content.phone) {
            throw new Error('Phone number is required for SMS');
          }
          await this.notificationService.sendSms(content.phone, content.body);
          break;

        case 'notification.in_app':
          await this.notificationService.sendInAppNotification(
            content.userId,
            content.title,
            content.body,
            content.data,
          );
          break;

        default:
          this.logger.warn(`Неизвестный тип уведомления: ${routingKey}`);
          throw new Error(`Unknown notification type: ${routingKey}`);
      }

      this.logger.info(`✅ Уведомление успешно обработано: ${content.userId}`);
    } catch (error) {
      this.logger.error(`❌ Ошибка обработки уведомления:`, error);
      throw error;
    }
  }
}
