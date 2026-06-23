import { Module, Global } from '@nestjs/common';

import { MetricsController } from './metrics.controller';

@Global()
@Module({
  exports: [MetricsController],
})
export class MetricsModule {}
