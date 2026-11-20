import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQConnection } from '../managers/connection.manager';
import { RabbitMQConfig } from '../rabbitmq.config';

import type { ConsumedMessageMetadata } from '../types/rabbitmq.types';

interface NotificationContent {
  userId: string;
  title: string;
  body: string;
  type: 'push' | 'sms' | 'in_app';
  data?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  phone?: string;
}

/** Сервис доставки уведомлений (передаётся снаружи) */
export interface NotificationSender {
  sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void>;
  sendSms(phone: string, body: string): Promise<void>;
  sendInAppNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void>;
}

export class NotificationConsumer extends RabbitMQConsumer {
  private readonly notificationService: NotificationSender | undefined;

  constructor(
    connection: RabbitMQConnection,
    config: RabbitMQConfig,
    notificationService?: NotificationSender,
  ) {
    super(connection, config);
    this.notificationService = notificationService;
  }

  async registerAll(): Promise<void> {
    await this.register({
      queue: 'notification.queue',
      routingKey: 'notification.#',
      handler: (content, metadata) =>
        this.handleNotification(content as NotificationContent, metadata),
    });
  }

  private async handleNotification(
    content: NotificationContent,
    metadata: ConsumedMessageMetadata,
  ): Promise<void> {
    const { routingKey } = metadata;

    this.logger.info(`🔔 Обработка уведомления: ${routingKey}`, {
      userId: content.userId,
      type: content.type,
      messageId: metadata.messageId,
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
