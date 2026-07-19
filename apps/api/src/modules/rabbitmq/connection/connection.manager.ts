import amqp, { Connection, Channel } from 'amqplib';
import { EventEmitter } from 'events';

import { IRabbitMQConnection } from '../types/rabbitmq.interfaces';

import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { RabbitMQConfig } from '../rabbitmq.config';
import { Inject, Injectable } from '@nestjs/common';
import { RABBITMQ_CONFIG } from '../constants/tokens.constants';

@Injectable()
export class RabbitMQConnection
  extends EventEmitter
  implements IRabbitMQConnection
{
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnected: false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private readonly logger: RabbitMQLogger;

  constructor(
    @Inject(RABBITMQ_CONFIG) private readonly config: RabbitMQConfig,
    private readonly onDisconnect?: () => Promise<void>,
  ) {
    super();
    this.logger = new RabbitMQLogger('RabbitMQConnection');
  }

  async connect(): Promise<Connection> {
    if (this.isConnected && this.connection) {
      return this.connection;
    }

    try {
      this.logger.info('Подключение к RabbitMQ...');

      this.connection = await amqp.connect(this.config.url, {
        heartbeat: this.config.heartbeat || 30,
        timeout: this.config.connectionTimeout || 10000,
      });

      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(this.config.prefetch);

      this.setupConnectionListeners();
      this.isConnected = true;

      this.logger.info('✅ RabbitMQ подключен успешно');
      this.emit('connected', this.connection);

      return this.connection;
    } catch (error) {
      this.logger.error('❌ Ошибка подключения к RabbitMQ:', error);
      this.isConnected = false;
      throw error;
    }
  }

  private setupConnectionListeners(): void {
    if (!this.connection) return;

    this.connection.on('error', async (error) => {
      this.logger.error('Ошибка соединения:', error);
      await this.handleDisconnect();
    });

    this.connection.on('close', async () => {
      this.logger.warn('Соединение закрыто');
      await this.handleDisconnect();
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

    this.isConnected = false;
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

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.reconnect();
        this.isReconnecting = false;
      } catch (error) {
        this.logger.error('Ошибка переподключения:', error);
        this.isReconnecting = false;
        this.scheduleReconnect();
      }
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
    if (!this.isConnected || !this.channel) {
      await this.connect();
    }
    return this.channel!;
  }

  getConnected(): boolean {
    return this.isConnected;
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

    this.isConnected = false;
    this.logger.info('Соединение закрыто');
    this.emit('closed');
  }
}
