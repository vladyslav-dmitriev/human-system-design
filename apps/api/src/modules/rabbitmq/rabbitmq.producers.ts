// src/modules/rabbitmq/rabbitmq.producer.ts
import { Injectable, Inject } from '@nestjs/common';
import { RabbitMQConnection } from './connection/connection.manager';
import { RabbitMQConfig } from './rabbitmq.config';
import {
  RABBITMQ_CONFIG,
  RABBITMQ_CONNECTION,
} from './constants/tokens.constants';
import { RabbitMQLogger } from './utils/rabbitmq.logger';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RabbitMQProducer {
  protected readonly logger: RabbitMQLogger;

  constructor(
    @Inject(RABBITMQ_CONNECTION) protected connection: RabbitMQConnection,
    @Inject(RABBITMQ_CONFIG) protected config: RabbitMQConfig,
  ) {
    this.logger = new RabbitMQLogger('RabbitMQProducer');

    // ✅ Проверяем, что connection передан
    if (!this.connection) {
      this.logger.error('❌ RabbitMQConnection не передан в конструктор!');
    }
  }

  async publish<T>(
    routingKey: string,
    message: T,
    options?: {
      exchange?: string;
      messageId?: string;
      correlationId?: string;
      replyTo?: string;
      expiration?: string;
      priority?: number;
      persistent?: boolean;
      headers?: Record<string, any>;
      type?: string;
    },
  ): Promise<boolean> {
    try {
      // ✅ Проверяем connection
      if (!this.connection) {
        throw new Error('RabbitMQ connection is not initialized');
      }

      const channel = await this.connection.getChannel();

      if (!channel) {
        throw new Error('Failed to get channel from connection');
      }

      const content = Buffer.from(JSON.stringify(message));

      const exchange = options?.exchange || this.config.exchange;

      console.log('📤 Exchange:', exchange); // ← Добавьте это
      console.log('📤 Routing key:', routingKey); // ← Добавьте это

      const published = channel.publish(exchange, routingKey, content, {
        messageId: options?.messageId || uuidv4(),
        correlationId: options?.correlationId,
        replyTo: options?.replyTo,
        expiration: options?.expiration,
        priority: options?.priority,
        persistent:
          options?.persistent !== undefined ? options.persistent : true,
        headers: options?.headers,
        timestamp: Date.now(),
        type: options?.type,
      });

      if (published) {
        this.logger.debug(`📤 Сообщение опубликовано в ${routingKey}`);
      } else {
        this.logger.warn(
          `⚠️ Сообщение не опубликовано (буфер заполнен) в ${routingKey}`,
        );
      }

      return published;
    } catch (error) {
      this.logger.error(`❌ Ошибка публикации в ${routingKey}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.logger.info('Продюсер закрыт');
  }
}
