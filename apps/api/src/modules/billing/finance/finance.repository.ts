import { Inject } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

export class FinanceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getUserBilling(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        userBillingProfile: {
          select: {
            stripeCustomerId: true,
            defaultPaymentMethodId: true,
            currency: true,
            taxId: true,
          },
        },

        subscription: {
          select: {
            id: true,
            stripeSubscriptionId: true,
            stripePriceId: true,
            status: true,
            autoRenew: true,
            currentPeriodEnd: true,
          },
        },

        features: {
          select: {
            id: true,
            expiresAt: true,
            product: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async createUserBilling({
    userId,
    stripeCustomerId,
  }: {
    userId: string;
    stripeCustomerId: string;
  }) {
    return this.prisma.userBillingProfile.upsert({
      where: { userId },
      update: { stripeCustomerId },
      create: {
        userId,
        stripeCustomerId,
        defaultPaymentMethodId: null,
        currency: '',
        taxId: '',
      },
    });
  }
}
