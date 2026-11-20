import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { MetricsModule } from '../metrics';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
