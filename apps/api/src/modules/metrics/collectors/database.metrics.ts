import { Inject, Injectable } from '@nestjs/common';

import { MetricsService } from '../metrics.service';

@Injectable()
export class DatabaseMetrics {
  constructor(
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  async observe<T>(
    model: string,
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const end = this.metrics.dbQueryDuration.startTimer();

    try {
      return await fn();
    } finally {
      end({
        model,
        operation,
      });
    }
  }
}
