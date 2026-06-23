import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class SubscriptionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async changeAutoRenew(stripeSubscriptionId: string, autoRenew: boolean) {
    return this.prisma.subscription.update({
      where: {
        stripeSubscriptionId,
      },
      data: {
        autoRenew,
      },
    });
  }
}
