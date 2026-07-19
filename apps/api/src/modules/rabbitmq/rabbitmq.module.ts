// src/modules/rabbitmq/rabbitmq.module.ts
import {
  Module,
  DynamicModule,
  Global,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Provider,
} from '@nestjs/common';

import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQConnection } from './managers/connection.manager';
import { EmailProducer } from './producers/email.producer';
import { OrderProducer } from './producers/order.producer';
import { NotificationProducer } from './producers/notification.producer';
import { EmailConsumer } from './consumers/email.consumer';
import { OrderConsumer } from './consumers/order.consumer';
import { NotificationConsumer } from './consumers/notification.consumer';
import { JsonSerializer } from './serializers/json.serializer';
import { loadRabbitMQConfig, RabbitMQConfig } from './rabbitmq.config';
import {
  RABBITMQ_MODULE_OPTIONS,
  RABBITMQ_CONFIG,
  RABBITMQ_CONNECTION,
  RABBITMQ_SERIALIZER,
  RABBITMQ_EMAIL_PRODUCER,
  RABBITMQ_ORDER_PRODUCER,
  RABBITMQ_NOTIFICATION_PRODUCER,
  RABBITMQ_EMAIL_CONSUMER,
  RABBITMQ_ORDER_CONSUMER,
  RABBITMQ_NOTIFICATION_CONSUMER,
} from './constants/tokens.constants';

export interface RabbitMQModuleOptions {
  config?: Partial<RabbitMQConfig>;
  environment?: 'development' | 'production' | 'test';
  emailService?: any;
  orderService?: any;
  notificationService?: any;
  global?: boolean;
}

export interface RabbitMQModuleAsyncOptions {
  imports?: any[];
  useFactory?: (
    ...args: any[]
  ) => Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
  inject?: any[];
  global?: boolean;
}

@Global()
@Module({})
export class RabbitMQModule implements OnModuleInit, OnModuleDestroy {
  private service: RabbitMQService | null = null;
  private isInitialized = false;
  private readonly logger = console;

  constructor(
    @Inject(RABBITMQ_MODULE_OPTIONS) private options: RabbitMQModuleOptions,
  ) {}

  static forRootAsync(asyncOptions: RabbitMQModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: RABBITMQ_MODULE_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject || [],
      },
      {
        provide: RABBITMQ_CONFIG,
        useFactory: (opts: RabbitMQModuleOptions) => {
          return loadRabbitMQConfig({
            environment: opts.environment,
            customConfig: opts.config,
          });
        },
        inject: [RABBITMQ_MODULE_OPTIONS],
      },
      {
        provide: RABBITMQ_SERIALIZER,
        useClass: JsonSerializer,
      },
      {
        provide: RABBITMQ_CONNECTION,
        useClass: RabbitMQConnection,
      },
      {
        provide: RABBITMQ_EMAIL_PRODUCER,
        useClass: EmailProducer,
      },
      {
        provide: RABBITMQ_ORDER_PRODUCER,
        useClass: OrderProducer,
      },
      {
        provide: RABBITMQ_NOTIFICATION_PRODUCER,
        useClass: NotificationProducer,
      },
      {
        provide: RABBITMQ_EMAIL_CONSUMER,
        useFactory: (
          connection: RabbitMQConnection,
          cfg: RabbitMQConfig,
          opts: RabbitMQModuleOptions,
        ) => {
          return new EmailConsumer(connection, cfg);
        },
        inject: [RABBITMQ_CONNECTION, RABBITMQ_CONFIG, RABBITMQ_MODULE_OPTIONS],
      },
      {
        provide: RABBITMQ_ORDER_CONSUMER,
        useFactory: (
          connection: RabbitMQConnection,
          cfg: RabbitMQConfig,
          opts: RabbitMQModuleOptions,
        ) => {
          return new OrderConsumer(connection, cfg);
        },
        inject: [RABBITMQ_CONNECTION, RABBITMQ_CONFIG, RABBITMQ_MODULE_OPTIONS],
      },
      {
        provide: RABBITMQ_NOTIFICATION_CONSUMER,
        useFactory: (
          connection: RabbitMQConnection,
          cfg: RabbitMQConfig,
          opts: RabbitMQModuleOptions,
        ) => {
          return new NotificationConsumer(connection, cfg);
        },
        inject: [RABBITMQ_CONNECTION, RABBITMQ_CONFIG, RABBITMQ_MODULE_OPTIONS],
      },
      RabbitMQService,
    ];

    return {
      module: RabbitMQModule,
      imports: asyncOptions.imports || [],
      providers,
      exports: [
        RabbitMQService,
        RABBITMQ_CONFIG,
        RABBITMQ_CONNECTION,
        RABBITMQ_EMAIL_PRODUCER,
        RABBITMQ_ORDER_PRODUCER,
        RABBITMQ_NOTIFICATION_PRODUCER,
        RABBITMQ_EMAIL_CONSUMER,
        RABBITMQ_ORDER_CONSUMER,
        RABBITMQ_NOTIFICATION_CONSUMER,
        RABBITMQ_SERIALIZER,
      ],
      global: asyncOptions.global || false,
    };
  }

  async onModuleInit() {
    if (this.isInitialized) return;

    try {
      this.logger.log('[RabbitMQModule] 🚀 Инициализация RabbitMQ...');

      const config = this.options.config
        ? loadRabbitMQConfig({ customConfig: this.options.config })
        : loadRabbitMQConfig();

      const connection = new RabbitMQConnection(config);
      const serializer = new JsonSerializer();

      const emailProducer = new EmailProducer(connection, config);
      const orderProducer = new OrderProducer(connection, config);
      const notificationProducer = new NotificationProducer(connection, config);

      const emailConsumer = new EmailConsumer(connection, config);
      const orderConsumer = new OrderConsumer(connection, config);
      const notificationConsumer = new NotificationConsumer(connection, config);

      this.service = new RabbitMQService(
        config,
        connection,
        emailProducer,
        orderProducer,
        notificationProducer,
        emailConsumer,
        orderConsumer,
        notificationConsumer,
      );

      await this.service.init();

      await emailConsumer.registerAll();

      this.isInitialized = true;
      this.logger.log('[RabbitMQModule] ✅ RabbitMQ инициализирован');
    } catch (error) {
      this.logger.error(
        '[RabbitMQModule] ❌ Ошибка инициализации RabbitMQ:',
        error,
      );
      this.isInitialized = false;
    }
  }

  async onModuleDestroy() {
    if (this.service) {
      this.logger.log('[RabbitMQModule] 🛑 Остановка RabbitMQ...');
      await this.service.shutdown();
      this.isInitialized = false;
      this.logger.log('[RabbitMQModule] ✅ RabbitMQ остановлен');
    }
  }

  getService(): RabbitMQService {
    if (!this.service) {
      throw new Error('RabbitMQ сервис не инициализирован');
    }
    return this.service;
  }
}
