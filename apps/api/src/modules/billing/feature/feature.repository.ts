import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class FeatureRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createUserFeature(userId: string, priceId: string) {
    await this.prisma.userFeature.create({
      data: { userId, priceId },
    });
  }
}
