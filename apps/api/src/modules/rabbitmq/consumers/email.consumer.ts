import { Injectable, OnModuleInit } from '@nestjs/common';

import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQConnection } from '../connection/connection.manager';
import { RabbitMQConfig } from '../rabbitmq.config';
import { QUEUE_DEFINITIONS } from '../constants/queue-definitions.constants';
import { RabbitMQLogger } from '../utils/rabbitmq.logger';

@Injectable()
export class EmailConsumer extends RabbitMQConsumer implements OnModuleInit {
  private readonly logger = new RabbitMQLogger('EmailConsumer');

  constructor(connection: RabbitMQConnection, config: RabbitMQConfig) {
    super(connection, config);
  }

  async onModuleInit() {
    await this.registerAll();
  }

  async registerAll(): Promise<void> {
    try {
      await this.register({
        queue: QUEUE_DEFINITIONS.EMAIL.name,
        routingKey: QUEUE_DEFINITIONS.EMAIL.routingKey,
        handler: this.handleEmail.bind(this),
        prefetch: 1,
      });

      this.logger.info('✅ EmailConsumer зарегистрирован и слушает очередь');
    } catch (error) {
      this.logger.error('❌ Ошибка регистрации EmailConsumer:', error);
    }
  }

  private async handleEmail(message: any, metadata: any) {
    this.logger.info('📨 Получено email сообщение:');
    console.log('📋 Content:', JSON.stringify(message, null, 2));
    console.log('🔑 Routing key:', metadata.routingKey);
    console.log('🏷️  Message ID:', metadata.messageId);
  }
}
