import { Module } from '@nestjs/common';
import { FeatureRepository } from './feature.repository';
import { FeatureService } from './feature.service';

@Module({
  imports: [],
  providers: [FeatureRepository, FeatureService],
  exports: [FeatureRepository, FeatureService],
})
export class FeatureModule {}
