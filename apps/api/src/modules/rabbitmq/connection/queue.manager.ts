// src/modules/rabbitmq/connection/queue.manager.ts
import { Channel } from 'amqplib';
import { RabbitMQConnection } from './connection.manager';
import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { ExchangeDefinition } from '../types/exchanges.types';
import { QUEUE_DEFINITIONS } from '../constants/queue-definitions.constants';

export class RabbitMQQueueManager {
  private readonly logger: RabbitMQLogger;

  constructor(private readonly connection: RabbitMQConnection) {
    this.logger = new RabbitMQLogger('QueueManager');
  }

  /**
   * ✅ Получаем СВЕЖИЙ канал для каждой операции
   */
  private async getFreshChannel(): Promise<Channel> {
    return await this.connection.getChannel();
  }

  async assertQueues(): Promise<void> {
    this.logger.info('📦 Создание всех очередей из определений...');

    for (const [key, definition] of Object.entries(QUEUE_DEFINITIONS)) {
      try {
        await this.assertQueue(definition.name, {
          durable: definition.durable ?? true,
          autoDelete: definition.autoDelete ?? false,
          arguments: definition.arguments || {},
        });
        this.logger.debug(`✅ Очередь "${definition.name}" создана/проверена`);
      } catch (error) {
        this.logger.error(
          `❌ Ошибка создания очереди "${definition.name}":`,
          error,
        );
        throw error;
      }
    }

    this.logger.info(
      `✅ Создано ${Object.keys(QUEUE_DEFINITIONS).length} очередей`,
    );
  }

  async assertQueue(
    queueName: string,
    options: {
      durable?: boolean;
      autoDelete?: boolean;
      exclusive?: boolean;
      arguments?: Record<string, any>;
    } = {},
  ): Promise<{ queue: string; messageCount: number; consumerCount: number }> {
    try {
      // ✅ Создаем НОВЫЙ канал для этой операции
      const channel = await this.getFreshChannel();

      const result = await channel.assertQueue(queueName, {
        durable: options.durable ?? true,
        autoDelete: options.autoDelete ?? false,
        exclusive: options.exclusive ?? false,
        arguments: options.arguments || {},
      });

      return result;
    } catch (error) {
      this.logger.error(`❌ Ошибка создания очереди "${queueName}":`, error);
      throw error;
    }
  }

  async assertExchange(exchange: ExchangeDefinition): Promise<void> {
    try {
      // ✅ Создаем НОВЫЙ канал для этой операции
      const channel = await this.getFreshChannel();

      await channel.assertExchange(exchange.name, exchange.type, {
        durable: exchange.durable ?? true,
        autoDelete: exchange.autoDelete ?? false,
        internal: exchange.internal ?? false,
        arguments: exchange.arguments,
      });

      this.logger.debug(`✅ Обменник "${exchange.name}" создан/проверен`);
    } catch (error) {
      this.logger.error(
        `❌ Ошибка создания обменника "${exchange.name}":`,
        error,
      );
      throw error;
    }
  }

  async getQueueInfo(queueName: string): Promise<{
    queue: string;
    messageCount: number;
    consumerCount: number;
  }> {
    try {
      // ✅ Создаем НОВЫЙ канал для этой операции
      const channel = await this.getFreshChannel();
      return await channel.checkQueue(queueName);
    } catch (error) {
      this.logger.error(
        `❌ Ошибка получения информации об очереди "${queueName}":`,
        error,
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    // Каналы закрываются автоматически через connection
    this.logger.info('QueueManager закрыт');
  }
}
