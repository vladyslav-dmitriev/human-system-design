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

  /** Allowlist: цена должна быть в таблице Product и быть активной. */
  async isPriceAllowed(stripePriceId: string): Promise<boolean> {
    const product = await this.prisma.product.findFirst({
      where: { stripePriceId, isActive: true },
      select: { id: true },
    });

    return product !== null;
  }
}
