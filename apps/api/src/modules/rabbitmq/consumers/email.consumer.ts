import { Injectable, OnModuleInit } from '@nestjs/common';

import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQConfig } from '../rabbitmq.config';
import { RabbitMQConnection } from '../managers/connection.manager';
import { QUEUES } from '../constants/queues.constants';

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        handler: this.handleEmail.bind(this),
        prefetch: 1,
      });

      await this.register({
        queue: QUEUES.EMAIL_MEDIUM.name,
        routingKey: QUEUES.EMAIL_MEDIUM.routingKey,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        handler: this.handleEmail.bind(this),
        prefetch: 1,
      });

      this.logger.info('✅ EmailConsumer successful register');
    } catch (error) {
      this.logger.error('❌ Error registration EmailConsumer:', error);
    }
  }

  private handleEmail(message: any, metadata: any) {
    this.logger.info('📨 Получено email сообщение:');
    console.log('📋 Content:', JSON.stringify(message, null, 2));
    console.log('🔑 Metadata:', metadata);
  }
}
