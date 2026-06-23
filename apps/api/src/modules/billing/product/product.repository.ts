import { Injectable, Inject } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ProductRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async upsertProduct(data: {
    stripePriceId: string;
    name: string;
    price: number;
    isActive: boolean;
  }) {
    return this.prisma.product.upsert({
      where: { stripePriceId: data.stripePriceId },
      update: {
        name: data.name,
        price: data.price,
        isActive: data.isActive,
      },
      create: {
        stripePriceId: data.stripePriceId,
        name: data.name,
        price: data.price,
        isActive: data.isActive,
      },
    });
  }
}
