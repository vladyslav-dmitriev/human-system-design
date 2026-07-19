// import { RabbitMQService as RabbitMQServiceCreator } from './services/rabbitmq.service';
// import { EmailProducer } from './producers/email.producer';
// import { OrderProducer } from './producers/order.producer';
// import { NotificationProducer } from './producers/notification.producer';
// import { EmailConsumer } from './consumers/email.consumer';
// import { OrderConsumer } from './consumers/order.consumer';
// import { NotificationConsumer } from './consumers/notification.consumer';
// import { JsonSerializer } from './serializers/json.serializer';
// import { loadRabbitMQConfig, RabbitMQConfig } from './rabbitmq.config';
// import { RabbitMQConnection } from './connection/connection.manager';

// export * from './types/rabbitmq.types';
// export * from './types/rabbitmq.interfaces';
// export * from './constants/tokens.constants';
// export * from './rabbitmq.config';
// export * from './producers/email.producer';
// export * from './producers/order.producer';
// export * from './producers/notification.producer';
// export * from './consumers/email.consumer';
// export * from './consumers/order.consumer';
// export * from './consumers/notification.consumer';
// export * from './services/rabbitmq.service';
// export * from './services/rabbitmq.health';
// export * from './constants/queue-definitions.constants';

// export interface RabbitMQModuleOptions {
//   config?: Partial<RabbitMQConfig>;
//   environment?: 'development' | 'production' | 'test';
//   emailService?: any;
//   orderService?: any;
//   notificationService?: any;
// }

// export class RabbitMQModule {
//   private static instance: RabbitMQModule;
//   private service: RabbitMQServiceCreator | null = null;
//   private emailProducer: EmailProducer | null = null;
//   private orderProducer: OrderProducer | null = null;
//   private notificationProducer: NotificationProducer | null = null;

//   private constructor() {}

//   static getInstance(): RabbitMQModule {
//     if (!RabbitMQModule.instance) {
//       RabbitMQModule.instance = new RabbitMQModule();
//     }
//     return RabbitMQModule.instance;
//   }

//   async initialize(
//     options: RabbitMQModuleOptions = {},
//   ): Promise<RabbitMQServiceCreator> {
//     if (this.service) {
//       return this.service;
//     }

//     const config = loadRabbitMQConfig({
//       environment: options.environment,
//       customConfig: options.config,
//     });

//     const serializer = new JsonSerializer();

//     const connection = new RabbitMQConnection(config);

//     this.emailProducer = new EmailProducer(connection, config, serializer);
//     this.orderProducer = new OrderProducer(connection, config, serializer);
//     this.notificationProducer = new NotificationProducer(
//       connection,
//       config,
//       serializer,
//     );

//     // Создаем консьюмеров с сервисами
//     const emailConsumer = new EmailConsumer(
//       connection,
//       config,
//       options.emailService,
//       serializer,
//     );

//     const orderConsumer = new OrderConsumer(
//       connection,
//       config,
//       options.orderService,
//       serializer,
//     );

//     const notificationConsumer = new NotificationConsumer(
//       connection,
//       config,
//       options.notificationService,
//       serializer,
//     );

//     // Создаем сервис
//     this.service = new RabbitMQServiceCreator(
//       config,
//       [emailConsumer, orderConsumer, notificationConsumer],
//       async () => {
//         // Очистка при завершении
//         await Promise.all([
//           this.emailProducer?.close(),
//           this.orderProducer?.close(),
//           this.notificationProducer?.close(),
//         ]);
//       },
//     );

//     await this.service.init();

//     return this.service;
//   }

//   getService(): RabbitMQServiceCreator {
//     if (!this.service) {
//       throw new Error(
//         'RabbitMQ модуль не инициализирован. Вызовите initialize() сначала.',
//       );
//     }
//     return this.service;
//   }

//   getEmailProducer(): EmailProducer {
//     if (!this.emailProducer) {
//       throw new Error('EmailProducer не инициализирован');
//     }
//     return this.emailProducer;
//   }

//   getOrderProducer(): OrderProducer {
//     if (!this.orderProducer) {
//       throw new Error('OrderProducer не инициализирован');
//     }
//     return this.orderProducer;
//   }

//   getNotificationProducer(): NotificationProducer {
//     if (!this.notificationProducer) {
//       throw new Error('NotificationProducer не инициализирован');
//     }
//     return this.notificationProducer;
//   }

//   async shutdown(): Promise<void> {
//     if (this.service) {
//       await this.service.shutdown();
//       this.service = null;
//     }
//   }
// }

// export const RabbitMQService = RabbitMQModule.getInstance();
