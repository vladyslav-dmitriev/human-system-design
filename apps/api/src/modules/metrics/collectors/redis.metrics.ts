import { Inject, Injectable } from '@nestjs/common';

import { MetricsService } from '../metrics.service';

@Injectable()
export class RedisMetrics {
  constructor(
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  hit() {
    this.metrics.redisCacheHitsMisses.labels('hit').inc();
  }

  miss() {
    this.metrics.redisCacheHitsMisses.labels('miss').inc();
  }
}
