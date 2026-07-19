import { RabbitMQConfig } from '../rabbitmq.config';
import { RabbitMQProducer } from '../rabbitmq.producers';
import { RabbitMQConnection } from '../managers/connection.manager';

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

  constructor(connection: RabbitMQConnection, config: RabbitMQConfig) {
    super(connection, config);
  }

  async sendEmail(email: EmailMessage): Promise<boolean> {
    return this.publish(EmailProducer.ROUTING_KEY, email, {
      type: EmailProducer.ROUTING_KEY,
      headers: {
        'x-message-type': 'email',
        'x-priority': 'normal',
      },
    });
  }
}
