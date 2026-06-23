import { Controller, Get, Res } from '@nestjs/common';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(@Res() res) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
