import { Inject } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

export class PaymentMethodRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async updateDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    return await this.prisma.userBillingProfile.update({
      where: {
        userId,
      },
      data: {
        defaultPaymentMethodId: paymentMethodId,
      },
    });
  }
}
