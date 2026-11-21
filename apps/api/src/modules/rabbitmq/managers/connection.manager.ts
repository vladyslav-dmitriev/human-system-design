import amqp, { ChannelModel, Channel } from 'amqplib';
import { EventEmitter } from 'events';

import { IRabbitMQConnection } from '../types/rabbitmq.interfaces';

import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { RabbitMQConfig } from '../rabbitmq.config';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { RABBITMQ_CONFIG } from '../constants/tokens.constants';

@Injectable()
export class RabbitMQConnection
  extends EventEmitter
  implements IRabbitMQConnection
{
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private readonly logger: RabbitMQLogger;

  constructor(
    @Inject(RABBITMQ_CONFIG) private readonly config: RabbitMQConfig,
    // Необязательный колбэк: без @Optional() Nest с метаданными декораторов
    // пытается внедрить `Function` и падает на старте
    @Optional() private readonly onDisconnect?: () => Promise<void>,
  ) {
    super();
    this.logger = new RabbitMQLogger('RabbitMQConnection');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<ChannelModel> {
    if (this.connected && this.connection) {
      return this.connection;
    }

    try {
      this.logger.info('Подключение к RabbitMQ...');

      // heartbeat в amqplib задаётся параметром URL, а не socketOptions
      const url = new URL(this.config.url);
      if (!url.searchParams.has('heartbeat')) {
        url.searchParams.set('heartbeat', String(this.config.heartbeat || 30));
      }

      this.connection = await amqp.connect(url.toString(), {
        timeout: this.config.connectionTimeout || 10000,
      });

      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(this.config.prefetch);

      this.setupConnectionListeners();
      this.connected = true;

      this.logger.info('✅ RabbitMQ подключен успешно');
      this.emit('connected', this.connection);

      return this.connection;
    } catch (error) {
      this.logger.error('❌ Ошибка подключения к RabbitMQ:', error);
      this.connected = false;
      throw error;
    }
  }

  private setupConnectionListeners(): void {
    if (!this.connection) return;

    this.connection.on('error', (error) => {
      this.logger.error('Ошибка соединения:', error);
      void this.handleDisconnect();
    });

    this.connection.on('close', () => {
      this.logger.warn('Соединение закрыто');
      void this.handleDisconnect();
    });

    this.connection.on('blocked', (reason) => {
      this.logger.warn('Соединение заблокировано:', reason);
      this.emit('blocked', reason);
    });

    this.connection.on('unblocked', () => {
      this.logger.info('Соединение разблокировано');
      this.emit('unblocked');
    });
  }

  private async handleDisconnect(): Promise<void> {
    if (this.isReconnecting) return;

    this.connected = false;
    this.channel = null;
    this.connection = null;

    if (this.onDisconnect) {
      await this.onDisconnect();
    }

    this.emit('disconnected');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.isReconnecting = true;
    this.logger.info(
      `Попытка переподключения через ${this.config.reconnectInterval}мс`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnect()
        .then(() => {
          this.isReconnecting = false;
        })
        .catch((error: unknown) => {
          this.logger.error('Ошибка переподключения:', error);
          this.isReconnecting = false;
          this.scheduleReconnect();
        });
    }, this.config.reconnectInterval);
  }

  async reconnect(): Promise<void> {
    this.logger.info('Переподключение к RabbitMQ...');
    this.isReconnecting = true;

    try {
      await this.close();
      await this.connect();
      this.isReconnecting = false;
      this.emit('reconnected');
      this.logger.info('✅ Переподключение успешно');
    } catch (error) {
      this.isReconnecting = false;
      throw error;
    }
  }

  async getChannel(): Promise<Channel> {
    if (!this.connected || !this.channel) {
      await this.connect();
    }
    return this.channel;
  }

  getConnected(): boolean {
    return this.connected;
  }

  async close(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isReconnecting = false;

    if (this.channel) {
      try {
        await this.channel.close();
      } catch (error) {
        this.logger.warn('Ошибка закрытия канала:', error);
      }
      this.channel = null;
    }

    if (this.connection) {
      try {
        await this.connection.close();
      } catch (error) {
        this.logger.warn('Ошибка закрытия соединения:', error);
      }
      this.connection = null;
    }

    this.connected = false;
    this.logger.info('Соединение закрыто');
    this.emit('closed');
  }
}
