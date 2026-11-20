import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { RedisMetrics } from './collectors/redis.metrics';
import { DatabaseMetrics } from './collectors/database.metrics';

// Global, so CacheModule and PrismaModule can use the collectors without
// importing MetricsModule (MetricsModule itself depends on nothing -> no cycles).
@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    RedisMetrics,
    DatabaseMetrics,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService, RedisMetrics, DatabaseMetrics],
})
export class MetricsModule {}
