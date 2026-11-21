import { Controller, Get, Inject, NotFoundException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { isMetricsEnabled } from '../../config/app.config';

import { MetricsService } from './metrics.service';

@Controller('metrics')
@SkipThrottle()
export class MetricsController {
  constructor(
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  @Get()
  async getMetrics() {
    // На проде по умолчанию выключено (ENABLE_METRICS=true включает для внутреннего скрейпа)
    if (!isMetricsEnabled()) {
      throw new NotFoundException();
    }

    return await this.metrics.getMetrics();
  }
}
