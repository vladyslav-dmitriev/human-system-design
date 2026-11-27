import { Message } from 'amqplib';
import { EventEmitter } from 'events';

import type {
  ConsumeOptions,
  MessageHandler,
  ConsumedMessageMetadata,
} from '../types/rabbitmq.types';
import { RabbitMQConnection } from '../managers/connection.manager';
import { RabbitMQConfig } from '../rabbitmq.config';
import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { QUEUES } from '../constants/queues.constants';

export class RabbitMQConsumer extends EventEmitter {
  private consumerTags: Map<string, string> = new Map();
  private pausedQueues: Set<string> = new Set();
  protected readonly logger: RabbitMQLogger;

  constructor(
    protected readonly connection: RabbitMQConnection,
    protected readonly config: RabbitMQConfig,
  ) {
    super();
    this.logger = new RabbitMQLogger('RabbitMQConsumer');
  }

  async register(options: ConsumeOptions): Promise<void> {
    try {
      const channel = await this.connection.getChannel();
      const { queue, routingKey, handler, noAck = false, prefetch } = options;

      if (prefetch) {
        await channel.prefetch(prefetch);
      }

      // Только assertQueue: он идемпотентен и безопасен при гонке с инициализацией очередей.
      // Раньше сначала шёл checkQueue: для ещё не созданной очереди брокер отвечает 404 и закрывает канал,
      // следующий assertQueue падал с «Channel closed by server», и api не стартовал.
      const queueDef = Object.values(QUEUES).find((def) => def.name === queue);

      await channel.assertQueue(
        queue,
        queueDef
          ? {
              durable: queueDef.durable ?? true,
              arguments: queueDef.arguments || {},
            }
          : {
              durable: true,
              arguments: {
                'x-queue-type': 'quorum',
                'x-max-priority': 5,
              },
            },
      );
      this.logger.debug(`✅ Очередь "${queue}" объявлена`);

      await channel.bindQueue(queue, this.config.exchange, routingKey);

      this.logger.debug(
        `🔗 Очередь "${queue}" привязана к "${this.config.exchange}" с ключом "${routingKey}"`,
      );

      const consumerTag = await channel.consume(
        queue,
        (msg: Message | null) => {
          if (!msg) return;
          void this.processMessage(msg, handler, queue, noAck);
        },
        { noAck },
      );

      this.consumerTags.set(queue, consumerTag.consumerTag);
      this.logger.info(`👂 Консьюмер запущен для "${queue}"`);

      this.emit('registered', {
        queue,
        routingKey,
        consumerTag: consumerTag.consumerTag,
      });
    } catch (error) {
      this.logger.error(
        `❌ Ошибка регистрации консьюмера для "${options.queue}":`,
        error,
      );
      throw error;
    }
  }

  registerAll(): Promise<void> {
    this.logger.info('📌 Регистрация всех консьюмеров...');
    return Promise.resolve();
  }

  private async processMessage(
    msg: Message,
    handler: MessageHandler,
    queue: string,
    noAck: boolean,
  ): Promise<void> {
    const channel = await this.connection.getChannel();
    const messageId = msg.properties.messageId as string | undefined;

    try {
      // Проверяем, не приостановлена ли очередь
      if (this.pausedQueues.has(queue)) {
        channel.nack(msg, false, true);
        return;
      }

      // Парсим содержимое
      const content: unknown = JSON.parse(msg.content.toString());

      // Формируем метаданные
      const metadata: ConsumedMessageMetadata = {
        queue,
        routingKey: msg.fields.routingKey,
        exchange: msg.fields.exchange,
        messageId,
        correlationId: msg.properties.correlationId as string | undefined,
        deliveryTag: msg.fields.deliveryTag,
        redelivered: msg.fields.redelivered,
        timestamp:
          (msg.properties.timestamp as number | undefined) || Date.now(),
        consumerTag: msg.fields.consumerTag,
        retryCount: (msg.properties.headers?.retryCount as number) || 0,
      };

      // Вызываем обработчик
      await handler(content, metadata);

      // Подтверждаем обработку
      if (!noAck) {
        channel.ack(msg);
      }

      this.logger.debug(`✅ Сообщение обработано из "${queue}"`);
      this.emit('processed', { queue, messageId });
    } catch (error: unknown) {
      this.logger.error(`❌ Ошибка обработки сообщения из "${queue}":`, error);
      if (!noAck) {
        // Отклоняем и возвращаем в очередь
        channel.nack(msg, false, true);
      }
      this.emit('error', { queue, error, messageId });
    }
  }

  async stop(queue: string): Promise<void> {
    const consumerTag = this.consumerTags.get(queue);
    if (consumerTag) {
      const channel = await this.connection.getChannel();
      await channel.cancel(consumerTag);
      this.consumerTags.delete(queue);
      this.pausedQueues.delete(queue);
      this.logger.info(`🛑 Консьюмер для "${queue}" остановлен`);
    }
  }

  async stopAll(): Promise<void> {
    for (const [queue, consumerTag] of this.consumerTags) {
      try {
        const channel = await this.connection.getChannel();
        await channel.cancel(consumerTag);
        this.logger.info(`🛑 Консьюмер для "${queue}" остановлен`);
      } catch (error) {
        this.logger.warn(
          `⚠️ Ошибка остановки консьюмера для "${queue}":`,
          error,
        );
      }
    }

    this.consumerTags.clear();
    this.pausedQueues.clear();
    this.logger.info('✅ Все консьюмеры остановлены');
  }

  pause(queue: string): Promise<void> {
    this.pausedQueues.add(queue);
    this.logger.info(`⏸️ Очередь "${queue}" приостановлена`);
    return Promise.resolve();
  }

  resume(queue: string): Promise<void> {
    this.pausedQueues.delete(queue);
    this.logger.info(`▶️ Очередь "${queue}" возобновлена`);
    return Promise.resolve();
  }

  getActiveConsumers(): string[] {
    return Array.from(this.consumerTags.keys());
  }

  isActive(queue: string): boolean {
    return this.consumerTags.has(queue);
  }

  isPaused(queue: string): boolean {
    return this.pausedQueues.has(queue);
  }

  getStats(): {
    activeConsumers: number;
    pausedQueues: number;
    queues: string[];
  } {
    return {
      activeConsumers: this.consumerTags.size,
      pausedQueues: this.pausedQueues.size,
      queues: Array.from(this.consumerTags.keys()),
    };
  }
}
