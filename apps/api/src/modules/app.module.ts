import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import { TodoModule } from './todo';
import { EmailModule, EmailService } from './sender/email';
import { StorageModule } from './storage';
import { UserModule } from './user';
import { PdfModule } from './pdf';
import { RedisModule } from './redis';
import { MetricsController, MetricsModule } from './metrics';
import { CacheModule } from './cache';
import { FinanceModule } from './billing/finance';
import { PaymentsModule } from './billing/payments';
import { InvoiceModule } from './billing/invoice';
import { PaymentMethodModule } from './billing/payment-method';
import { SubscriptionModule } from './billing/subscription';

import { PrismaModule } from '../prisma';
import { AppService } from './app.service';
import { SmsModule } from './sender/sms';
import { AuthModule } from './auth';
import { CaptchaModule } from './captcha';
import { FeatureModule } from './billing/feature';
import { ProductModule } from './billing/product';
import { AppController } from './app.controller';
import appConfig from 'config/app.config';
import databaseConfig from 'config/database.config';
import redisConfig from 'config/redis.config';
import { RabbitMQModule } from './rabbitmq';
// import { validationSchema } from 'config/validation';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 10, ttl: 60000 }],
      storage: new ThrottlerStorageRedisService(process.env.REDIS_URL),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
      // validationSchema,
      load: [appConfig, databaseConfig, redisConfig],
    }),

    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL },
      defaultJobOptions: {
        removeOnComplete: {
          count: 100,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 100,
        },
      },
    }),

    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    PrismaModule,
    CacheModule,
    RedisModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = configService.get('NODE_ENV') === 'development';

        return {
          environment: isDevelopment ? 'development' : 'production',
          config: {
            url: configService.get(
              'RABBITMQ_URL',
              'amqp://admin:admin123@rabbitmq:5672',
            ),
            prefetch: 1,
            // prefetch: configService.get('RABBITMQ_PREFETCH', 1),
            reconnectInterval: configService.get(
              'RABBITMQ_RECONNECT_INTERVAL',
              5000,
            ),
            maxRetries: configService.get('RABBITMQ_MAX_RETRIES', 5),
          },
          // ✅ Передаем сервисы
          emailService: new EmailService(),
          // orderService: new OrderService(),
          // notificationService: new NotificationService(),
          global: true,
        };
      },
      inject: [ConfigService],
      global: true,
    }),
    AuthModule,
    UserModule,

    FinanceModule,
    PaymentsModule,
    SubscriptionModule,
    PaymentMethodModule,
    InvoiceModule,
    FeatureModule,
    ProductModule,

    EmailModule,
    SmsModule,
    StorageModule,
    CaptchaModule,
    MetricsModule,

    TodoModule,
    PdfModule,
  ],
  controllers: [MetricsController, AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
