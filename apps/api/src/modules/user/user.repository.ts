import { Inject, Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from 'prisma/prisma.service';

export type UpdateBillingSubscriptionData = {
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: string;
  autoRenew: boolean;
  currentPeriodEnd: Date | null;
};

const selectUser = {
  id: true,
  name: true,
  email: true,
  // isVerified: true,
  // stripeCustomerId: true,
  // stripeSubscriptionId: true,
  // stripePriceId: true,
  // subscriptionStatus: true,
  // autoRenew: true,
  // currentPeriodEnd: true,
  // defaultPaymentMethodId: true,
  // features: true,
  // phone: true,
  // twoFactorEnabled: true,
};

@Injectable()
export class UserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,

        profile: {
          select: {
            name: true,
            phone: true,
          },
        },
        authSettings: {
          select: {
            isVerified: true,
            verifiedToken: true,
            twoFactorEnabled: true,
          },
        },

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
            stripeSubscriptionId: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        ...selectUser,
        password: true,
      },
    });
  }

  async getUserByStripeCustomerId(stripeCustomerId: string) {
    return this.prisma.userBillingProfile.findUnique({
      where: { stripeCustomerId },
      include: {
        user: true,
      },
    });
  }

  async checkUserEmailExist(userId: string | undefined, email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });
  }

  async updateUser(
    where: Prisma.UserWhereUniqueInput,
    data: Prisma.UserUpdateInput,
  ) {
    await this.prisma.user.update({
      where,
      data,
    });
  }

  async updateUserTwoFactor({
    userId,
    phone,
    twoFactorEnabled,
  }: {
    userId: string;
    phone: string;
    twoFactorEnabled: boolean;
  }) {
    await this.prisma.userProfile.update({
      where: {
        userId,
      },
      data: {
        phone,
      },
    });

    await this.prisma.authSettings.update({
      where: {
        userId,
      },
      data: {
        twoFactorEnabled,
      },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    verifiedToken: string;
    isVerified: boolean;
  }) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: data.password,

          profile: {
            create: {
              name: data.name,
              phone: '',
            },
          },

          authSettings: {
            create: {
              isVerified: false,
              verifiedToken: null,
              twoFactorEnabled: false,
            },
          },
        },
      });

      return user;
    });
  }

  async updateBillingSubscription(data: UpdateBillingSubscriptionData) {
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { userId: data.userId },
    });

    if (existingSubscription) {
      return await this.prisma.subscription.update({
        where: { userId: data.userId },
        data: {
          stripeSubscriptionId: data.stripeSubscriptionId,
          stripePriceId: data.stripePriceId,
          status: data.status,
          currentPeriodEnd: data.currentPeriodEnd,
          autoRenew: data.autoRenew,
        },
      });
    } else {
      return await this.prisma.subscription.create({
        data: {
          userId: data.userId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          stripePriceId: data.stripePriceId,
          status: data.status,
          currentPeriodEnd: data.currentPeriodEnd,
          autoRenew: data.autoRenew,
        },
      });
    }
  }
}
