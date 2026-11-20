import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { RedisMetrics } from './collectors/redis.metrics';

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    RedisMetrics,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService, RedisMetrics],
})
export class MetricsModule {}
