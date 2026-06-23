import { Inject } from '@nestjs/common';
import { FeatureRepository } from './feature.repository';

export class FeatureService {
  constructor(
    @Inject(FeatureRepository)
    private readonly featureRepository: FeatureRepository,
  ) {}

  async createUserFeature(userId: string, priceId: string) {
    return this.featureRepository.createUserFeature(userId, priceId);
  }
}
