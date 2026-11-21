import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import { TodoModule } from './todo';
import { EmailModule } from './sender/email';
import { StorageModule } from './storage';
import { UserModule } from './user';
import { PdfModule } from './pdf';
import Redis from 'ioredis';
import { RedisModule } from './redis';
import { REDIS_CLIENT } from './redis/redis.module';
import { MetricsModule } from './metrics';
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
import { AppThrottlerGuard } from './app.throttler.guard';
import appConfig from 'config/app.config';
import databaseConfig from 'config/database.config';
import { validationSchema } from 'config/validation';
import { getBullConnection } from 'config/queue.config';
import { RabbitMQModule } from './rabbitmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
      load: [appConfig, databaseConfig],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [{ limit: 100, ttl: 60000 }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),

    // Очереди (письма, платежи, PDF). Redis читается лениво, после загрузки .env.
    BullModule.forRootAsync({
      useFactory: () => ({ connection: getBullConnection() }),
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
          // emailService: new EmailService(),
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
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
