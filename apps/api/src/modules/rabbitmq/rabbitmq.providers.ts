import { Provider } from '@nestjs/common';

import { RabbitMQModuleOptions } from './rabbitmq.module';
import {
  RABBITMQ_CONFIG,
  RABBITMQ_CONNECTION,
  RABBITMQ_SERIALIZER,
  RABBITMQ_EMAIL_PRODUCER,
  RABBITMQ_ORDER_PRODUCER,
  RABBITMQ_NOTIFICATION_PRODUCER,
  RABBITMQ_EMAIL_CONSUMER,
  RABBITMQ_ORDER_CONSUMER,
  RABBITMQ_NOTIFICATION_CONSUMER,
  RABBITMQ_MODULE_OPTIONS,
} from './constants/tokens.constants';
import { loadRabbitMQConfig } from './rabbitmq.config';
import { RabbitMQConnection } from './connection/connection.manager';
import { JsonSerializer } from './serializers/json.serializer';
import { EmailProducer } from './producers/email.producer';
import { OrderProducer } from './producers/order.producer';
import { NotificationProducer } from './producers/notification.producer';
import { EmailConsumer } from './consumers/email.consumer';
import { OrderConsumer } from './consumers/order.consumer';
import { NotificationConsumer } from './consumers/notification.consumer';

export function createRabbitMQProviders(
  options: RabbitMQModuleOptions,
): Provider[] {
  const config = loadRabbitMQConfig({
    environment: options.environment,
    customConfig: options.config,
  });

  return [
    {
      provide: RABBITMQ_MODULE_OPTIONS,
      useValue: options,
    },
    {
      provide: RABBITMQ_CONFIG,
      useValue: config,
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
      useFactory: (connection: RabbitMQConnection) => {
        return new EmailConsumer(
          connection,
          config,
          options.emailService,
          new JsonSerializer(),
        );
      },
      inject: [RABBITMQ_CONNECTION],
    },
    {
      provide: RABBITMQ_ORDER_CONSUMER,
      useFactory: (connection: RabbitMQConnection) => {
        return new OrderConsumer(
          connection,
          config,
          options.orderService,
          new JsonSerializer(),
        );
      },
      inject: [RABBITMQ_CONNECTION],
    },
    {
      provide: RABBITMQ_NOTIFICATION_CONSUMER,
      useFactory: (connection: RabbitMQConnection) => {
        return new NotificationConsumer(
          connection,
          config,
          options.notificationService,
          new JsonSerializer(),
        );
      },
      inject: [RABBITMQ_CONNECTION],
    },
  ];
}
