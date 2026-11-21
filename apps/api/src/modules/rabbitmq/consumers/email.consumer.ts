import { Injectable, OnModuleInit } from '@nestjs/common';

import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQConfig } from '../rabbitmq.config';
import { RabbitMQConnection } from '../managers/connection.manager';
import { QUEUES } from '../constants/queues.constants';
import type { ConsumedMessageMetadata } from '../types/rabbitmq.types';

@Injectable()
export class EmailConsumer extends RabbitMQConsumer implements OnModuleInit {
  constructor(connection: RabbitMQConnection, config: RabbitMQConfig) {
    super(connection, config);
  }

  async onModuleInit() {
    await this.registerAll();
  }

  async registerAll() {
    try {
      await this.register({
        queue: QUEUES.EMAIL_HIGH.name,
        routingKey: QUEUES.EMAIL_HIGH.routingKey,
        handler: (content, metadata) => this.handleEmail(content, metadata),
        prefetch: 1,
      });

      await this.register({
        queue: QUEUES.EMAIL_MEDIUM.name,
        routingKey: QUEUES.EMAIL_MEDIUM.routingKey,
        handler: (content, metadata) => this.handleEmail(content, metadata),
        prefetch: 1,
      });

      this.logger.info('✅ EmailConsumer successful register');
    } catch (error) {
      this.logger.error('❌ Error registration EmailConsumer:', error);
    }
  }

  private handleEmail(message: unknown, metadata: ConsumedMessageMetadata) {
    // Письмо целиком (адрес, токены, текст) в лог не пишем: только служебные поля
    this.logger.info('📨 Получено email сообщение', {
      messageId: metadata.messageId,
      routingKey: metadata.routingKey,
      hasContent: message !== undefined && message !== null,
    });
  }
}
