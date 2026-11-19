import { RabbitMQConfig } from '../rabbitmq.config';
import { RabbitMQProducer } from '../rabbitmq.producers';
import { RabbitMQConnection } from '../managers/connection.manager';
import { ROUTING_KEYS } from '../constants/routings.constants';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  userId?: string;
  template?: string;
  templateData?: Record<string, any>;
}

export class EmailProducer extends RabbitMQProducer {
  constructor(connection: RabbitMQConnection, config: RabbitMQConfig) {
    super(connection, config);
  }

  async sendEmailUserCreate(email: EmailMessage): Promise<boolean> {
    return this.publish(ROUTING_KEYS.EMAIL_USER_CREATE, email, {
      type: ROUTING_KEYS.EMAIL_USER_CREATE,
      headers: {
        'x-message-type': 'email',
        'x-priority': 'normal',
      },
      persistent: true,
    });
  }

  async sendEmailPaymentCreate(email: EmailMessage): Promise<boolean> {
    return this.publish(ROUTING_KEYS.EMAIL_PAYMENT_CREATE, email, {
      type: ROUTING_KEYS.EMAIL_PAYMENT_CREATE,
      headers: {
        'x-message-type': 'email',
        'x-priority': 'high',
      },
      persistent: true,
    });
  }
}
