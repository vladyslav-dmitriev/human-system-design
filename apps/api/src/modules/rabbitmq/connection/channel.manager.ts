import { Channel } from 'amqplib';
import { EventEmitter } from 'events';

import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { RabbitMQConnection } from './connection.manager';

export interface ChannelPoolOptions {
  minChannels?: number;
  maxChannels?: number;
  idleTimeout?: number;
  channelPrefetch?: number;
}

export class ChannelManager extends EventEmitter {
  private channels: Map<number, Channel> = new Map();
  private channelPool: Channel[] = [];
  private readonly logger: RabbitMQLogger;
  private isShuttingDown = false;

  constructor(
    private readonly connection: RabbitMQConnection,
    private readonly options: ChannelPoolOptions = {},
  ) {
    super();
    this.logger = new RabbitMQLogger('ChannelManager');
    this.options = {
      minChannels: 1,
      maxChannels: 50,
      idleTimeout: 60000,
      channelPrefetch: 1,
      ...options,
    };
  }

  /**
   * Инициализация пула каналов
   */
  async initialize(): Promise<void> {
    this.logger.info('Инициализация менеджера каналов...');

    for (let i = 0; i < (this.options.minChannels || 1); i++) {
      const channel = await this.createChannel();
      this.channelPool.push(channel);
    }

    this.logger.info(`✅ Создано ${this.channelPool.length} каналов`);
  }

  /**
   * Создание нового канала
   */
  private async createChannel(): Promise<Channel> {
    const connection = await this.connection.connect();
    const channel = await connection.createChannel();

    if (this.options.channelPrefetch) {
      await channel.prefetch(this.options.channelPrefetch);
    }

    // Обработчики событий канала
    channel.on('error', (error) => {
      this.logger.error('Ошибка канала:', error);
      this.emit('channelError', { channel, error });
    });

    channel.on('close', () => {
      this.logger.warn('Канал закрыт');
      this.channels.delete(channel.channel);
      this.emit('channelClosed', { channel });
    });

    this.channels.set(channel.channel, channel);
    this.emit('channelCreated', { channel });

    return channel;
  }

  /**
   * Получение канала из пула
   */
  async getChannel(): Promise<Channel> {
    if (this.isShuttingDown) {
      throw new Error('ChannelManager is shutting down');
    }

    // Если есть свободный канал в пуле
    if (this.channelPool.length > 0) {
      return this.channelPool.pop()!;
    }

    // Если не превышен максимум, создаем новый
    if (this.channels.size < (this.options.maxChannels || 50)) {
      return this.createChannel();
    }

    // Если достигнут лимит, ждем освобождения канала
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('channelReleased', onChannelReleased);
        reject(new Error('Timeout waiting for channel'));
      }, 10000);

      const onChannelReleased = (channel: Channel) => {
        clearTimeout(timeout);
        this.removeListener('channelReleased', onChannelReleased);
        resolve(channel);
      };

      this.once('channelReleased', onChannelReleased);
    });
  }

  /**
   * Освобождение канала обратно в пул
   */
  releaseChannel(channel: Channel): void {
    if (this.isShuttingDown) {
      this.closeChannel(channel);
      return;
    }

    // Проверяем, что канал все еще открыт
    if (!this.isChannelOpen(channel)) {
      this.channels.delete(channel.channel);
      this.emit('channelRemoved', { channel });
      return;
    }

    // Возвращаем в пул
    this.channelPool.push(channel);
    this.emit('channelReleased', { channel });
  }

  /**
   * Проверка, открыт ли канал
   */
  private isChannelOpen(channel: Channel): boolean {
    try {
      return !!(channel && channel.channel !== undefined);
    } catch {
      return false;
    }
  }

  /**
   * Закрытие канала
   */
  async closeChannel(channel: Channel): Promise<void> {
    try {
      await channel.close();
      this.channels.delete(channel.channel);
    } catch (error) {
      this.logger.warn('Ошибка закрытия канала:', error);
    }
  }

  /**
   * Получение канала для конкретной очереди
   */
  async getChannelForQueue(queue: string): Promise<Channel> {
    // В простой реализации просто возвращаем любой канал
    // В более сложной можно использовать привязку каналов к очередям
    return this.getChannel();
  }

  /**
   * Создание канала с определенным prefetch
   */
  async createChannelWithPrefetch(prefetch: number): Promise<Channel> {
    const channel = await this.createChannel();
    await channel.prefetch(prefetch);
    return channel;
  }

  /**
   * Получение статистики пула
   */
  getStats(): {
    totalChannels: number;
    availableChannels: number;
    busyChannels: number;
  } {
    const total = this.channels.size;
    const available = this.channelPool.length;
    return {
      totalChannels: total,
      availableChannels: available,
      busyChannels: total - available,
    };
  }

  /**
   * Закрытие всех каналов
   */
  async closeAll(): Promise<void> {
    this.isShuttingDown = true;

    this.logger.info('Закрытие всех каналов...');

    // Закрываем все каналы в пуле
    for (const channel of this.channelPool) {
      await this.closeChannel(channel);
    }
    this.channelPool = [];

    // Закрываем все остальные каналы
    for (const [id, channel] of this.channels) {
      await this.closeChannel(channel);
    }
    this.channels.clear();

    this.logger.info('✅ Все каналы закрыты');
  }

  /**
   * Сброс пула
   */
  reset(): void {
    this.channelPool = [];
    this.logger.info('Пул каналов сброшен');
  }
}
