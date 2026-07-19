import { RabbitMQConnection } from '../managers/connection.manager';
import { RabbitMQConfig } from '../rabbitmq.config';
import { RabbitMQProducer } from '../rabbitmq.producers';

import type { IRabbitMQSerializer } from '../types/rabbitmq.interfaces';

export interface NotificationMessage {
  userId: string;
  title: string;
  body: string;
  type: 'push' | 'sms' | 'in_app';
  data?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}

export class NotificationProducer extends RabbitMQProducer {
  constructor(
    connection: RabbitMQConnection,
    config: RabbitMQConfig,
    serializer?: IRabbitMQSerializer,
  ) {
    super(connection, config, serializer);
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    return this.publish(
      'notification.push',
      {
        userId,
        title,
        body,
        type: 'push',
        data,
        priority: 'high',
      } as NotificationMessage,
      {
        type: 'notification.push',
        headers: {
          'x-message-type': 'notification',
          'x-priority': 'high',
        },
      },
    );
  }

  async sendSms(phone: string, text: string): Promise<boolean> {
    return this.publish(
      'notification.sms',
      {
        phone,
        body: text,
        type: 'sms',
        priority: 'normal',
      } as NotificationMessage,
      {
        type: 'notification.sms',
        headers: {
          'x-message-type': 'notification',
          'x-priority': 'normal',
        },
      },
    );
  }

  async sendInAppNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    return this.publish(
      'notification.in_app',
      {
        userId,
        title,
        body,
        type: 'in_app',
        data,
        priority: 'normal',
      } as NotificationMessage,
      {
        type: 'notification.in_app',
        headers: {
          'x-message-type': 'notification',
          'x-priority': 'normal',
        },
      },
    );
  }
}
