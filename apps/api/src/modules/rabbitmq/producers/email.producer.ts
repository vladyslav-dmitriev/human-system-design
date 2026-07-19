import { RabbitMQConfig } from '../rabbitmq.config';
import { RabbitMQProducer } from '../rabbitmq.producers';
import { RabbitMQConnection } from '../connection/connection.manager';

import type { IRabbitMQSerializer } from '../types/rabbitmq.interfaces';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  userId?: string;
  template?: string;
  templateData?: Record<string, any>;
}

export class EmailProducer extends RabbitMQProducer {
  private static readonly ROUTING_KEY = 'email.send';

  constructor(
    connection: RabbitMQConnection,
    config: RabbitMQConfig,
    serializer?: IRabbitMQSerializer,
  ) {
    super(connection, config, serializer);
  }

  async sendEmail(email: EmailMessage): Promise<boolean> {
    return this.publish(EmailProducer.ROUTING_KEY, email, {
      type: 'email.send',
      headers: {
        'x-message-type': 'email',
        'x-priority': 'normal',
      },
    });
  }

  async sendWelcomeEmail(
    userId: string,
    email: string,
    username: string,
  ): Promise<boolean> {
    return this.publish(
      EmailProducer.ROUTING_KEY,
      {
        to: email,
        subject: 'Добро пожаловать!',
        template: 'welcome',
        templateData: { username, userId },
        userId,
      } as EmailMessage,
      {
        type: 'email.welcome',
        headers: {
          'x-message-type': 'email',
          'x-priority': 'high',
        },
      },
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    return this.publish(
      EmailProducer.ROUTING_KEY,
      {
        to: email,
        subject: 'Сброс пароля',
        template: 'reset_password',
        templateData: { token },
      } as EmailMessage,
      {
        type: 'email.reset_password',
        headers: {
          'x-message-type': 'email',
          'x-priority': 'high',
        },
      },
    );
  }
}
