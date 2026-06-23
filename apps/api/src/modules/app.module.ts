import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import { TodoModule } from './todo';
import { EmailModule } from './sender/email';
import { StorageModule } from './storage';
import { UserModule } from './user';
import { PdfModule } from './pdf';
import { RedisModule } from './redis';
import { MetricsController } from './metrics';
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

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 10, ttl: 60000 }],
      storage: new ThrottlerStorageRedisService(process.env.REDIS_URL),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
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

    TodoModule,
    PdfModule,
  ],
  controllers: [MetricsController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
