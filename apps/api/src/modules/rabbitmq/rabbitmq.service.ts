// src/modules/rabbitmq/services/rabbitmq.service.ts
import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  RABBITMQ_CONFIG,
  RABBITMQ_CONNECTION,
  RABBITMQ_EMAIL_PRODUCER,
  RABBITMQ_ORDER_PRODUCER,
  RABBITMQ_NOTIFICATION_PRODUCER,
  RABBITMQ_EMAIL_CONSUMER,
  RABBITMQ_ORDER_CONSUMER,
  RABBITMQ_NOTIFICATION_CONSUMER,
} from './constants/tokens.constants';
import { RabbitMQConfig } from './rabbitmq.config';
import { RabbitMQConnection } from './managers/connection.manager';
import { RabbitMQQueueManager } from './managers/queue.manager';
import { RabbitMQHealth } from './rabbitmq.health';
import { RabbitMQLogger } from './utils/rabbitmq.logger';
import { EXCHANGES } from './constants/exchanges.constants';
import { DEFAULT_BINDINGS } from './constants/bindings.constants';
import { RabbitMQQueueBinder } from './bindings/queue-binder';
import { EmailProducer } from './producers/email.producer';
import { OrderProducer } from './producers/order.producer';
import { NotificationProducer } from './producers/notification.producer';
import { EmailConsumer } from './consumers/email.consumer';
import { OrderConsumer } from './consumers/order.consumer';
import { NotificationConsumer } from './consumers/notification.consumer';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: RabbitMQLogger;
  private queueManager: RabbitMQQueueManager;
  private queueBinder: RabbitMQQueueBinder;
  private health: RabbitMQHealth;
  private isInitialized = false;

  constructor(
    @Inject(RABBITMQ_CONFIG) private config: RabbitMQConfig,
    @Inject(RABBITMQ_CONNECTION) private connection: RabbitMQConnection,
    @Inject(RABBITMQ_EMAIL_PRODUCER) private emailProducer: EmailProducer,
    @Inject(RABBITMQ_ORDER_PRODUCER) private orderProducer: OrderProducer,
    @Inject(RABBITMQ_NOTIFICATION_PRODUCER)
    private notificationProducer: NotificationProducer,
    @Inject(RABBITMQ_EMAIL_CONSUMER) private emailConsumer: EmailConsumer,
    @Inject(RABBITMQ_ORDER_CONSUMER) private orderConsumer: OrderConsumer,
    @Inject(RABBITMQ_NOTIFICATION_CONSUMER)
    private notificationConsumer: NotificationConsumer,
    private moduleRef: ModuleRef,
  ) {
    this.logger = new RabbitMQLogger('RabbitMQService');
    this.queueManager = new RabbitMQQueueManager(this.connection);
    this.queueBinder = new RabbitMQQueueBinder(this.connection);
    this.health = new RabbitMQHealth(this.connection, this.queueManager);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.init();
    } catch {
      this.logger.error('❌ RabbitMQ недоступен, приложение продолжает работу');
      this.isInitialized = false;
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.logger.info('🚀 Инициализация RabbitMQ сервиса...');

    try {
      // 1. Подключаемся
      await this.connection.connect();
      this.logger.info('✅ Подключение к RabbitMQ установлено');

      // 2. Создаем обменники
      for (const exchange of Object.values(EXCHANGES)) {
        await this.queueManager.assertExchange(exchange);
      }
      this.logger.info(
        `✅ Создано ${Object.keys(EXCHANGES).length} обменников`,
      );

      // 3. Создаем очереди
      await this.queueManager.assertQueues();

      // 4. Применяем биндинги
      await this.queueBinder.applyBindings(
        DEFAULT_BINDINGS,
        this.config.exchange,
      );

      this.isInitialized = true;
      this.logger.info('✅ RabbitMQ сервис успешно инициализирован');
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации RabbitMQ:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.connection.isConnected();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isInitialized) {
      this.logger.info('🛑 Остановка RabbitMQ...');
      await this.connection.close();
      this.isInitialized = false;
    }
  }

  // ============================================
  // ✅ ГЕТТЕРЫ ДЛЯ ПРОДЮСЕРОВ
  // ============================================

  getEmailProducer(): EmailProducer {
    return this.emailProducer;
  }

  getOrderProducer(): OrderProducer {
    return this.orderProducer;
  }

  getNotificationProducer(): NotificationProducer {
    return this.notificationProducer;
  }

  // ============================================
  // ✅ ГЕТТЕРЫ ДЛЯ КОНСЬЮМЕРОВ
  // ============================================

  getEmailConsumer(): EmailConsumer {
    return this.emailConsumer;
  }

  getOrderConsumer(): OrderConsumer {
    return this.orderConsumer;
  }

  getNotificationConsumer(): NotificationConsumer {
    return this.notificationConsumer;
  }

  // ✅ НОВЫЙ МЕТОД: возвращает любого консьюмера (для тестов)
  getConsumer(): EmailConsumer | OrderConsumer | NotificationConsumer {
    return this.emailConsumer;
  }

  // ============================================
  // ДРУГИЕ ГЕТТЕРЫ
  // ============================================

  getConnection(): RabbitMQConnection {
    return this.connection;
  }

  getQueueManager(): RabbitMQQueueManager {
    return this.queueManager;
  }

  getQueueBinder(): RabbitMQQueueBinder {
    return this.queueBinder;
  }

  getHealth(): RabbitMQHealth {
    return this.health;
  }

  getConfig(): RabbitMQConfig {
    return this.config;
  }

  getStatus(): {
    initialized: boolean;
    connected: boolean;
  } {
    return {
      initialized: this.isInitialized,
      connected: this.connection.isConnected(),
    };
  }
}
