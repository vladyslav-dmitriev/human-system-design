import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

export interface IUserRepository {
  getUserById(userId: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<any>;
  createUser(data: {
    name: string;
    email: string;
    password: string;
    verifiedToken: string;
    isVerified: boolean;
  }): Promise<any>;
  checkUserEmailExist(userId: string, email: string): Promise<any>;
  updateUser(where: object, data: object): Promise<any>;
}

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
export class UserRepository implements IUserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getUserById(
    userId: string,
  ): ReturnType<IUserRepository['getUserById']> {
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

  async getUserByEmail(
    email: string,
  ): ReturnType<IUserRepository['getUserByEmail']> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        ...selectUser,
        password: true,
      },
    });
  }

  async getUserByStripeCustomerId(
    stripeCustomerId: string,
  ): ReturnType<IUserRepository['getUserById']> {
    return this.prisma.userBillingProfile.findUnique({
      where: { stripeCustomerId },
      include: {
        user: true,
      },
    });
  }

  async checkUserEmailExist(
    userId: string | undefined,
    email: string,
  ): ReturnType<IUserRepository['checkUserEmailExist']> {
    return this.prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });
  }

  async updateUser(where: object, data: object) {
    await this.prisma.user.update({
      // @ts-ignore
      where,
      data,
    });
  }

  async updateUserTwoFactor({ userId, phone, twoFactorEnabled }) {
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

  async updateBillingSubscription(data: any) {
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
