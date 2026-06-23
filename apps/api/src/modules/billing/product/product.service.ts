import Stripe from 'stripe';
import { Inject } from '@nestjs/common';

import { CACHE } from 'config/cache.config';

import { CacheService } from '../../cache';
import { ProductMapper } from './product.mapper';
import { PaymentsService } from '../payments';
import { ProductRepository } from './product.repository';

export class ProductService {
  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(ProductRepository)
    private readonly productRepository: ProductRepository,
    @Inject(CacheService) private readonly cacheService: CacheService,
  ) {}

  async getProducts() {
    const cached = await this.cacheService.get(CACHE.AvailablePlans);
    if (cached) return cached;

    const allPrices = await this.paymentsService.getPricesList();

    const result = {
      recurring: allPrices.data
        .filter((p) => p.type === 'recurring')
        .map(ProductMapper.toDomain),
      oneTime: allPrices.data
        .filter((p) => p.type === 'one_time')
        .map(ProductMapper.toDomain),
    };

    await this.cacheService.set(CACHE.AvailablePlans, result, 3600);

    return result;
  }

  async syncProducts() {
    const allPrices = await this.paymentsService.getPricesList();

    allPrices.data.forEach(async (price) => {
      return await this.productRepository.upsertProduct({
        stripePriceId: price.id,
        name: price.product.name,
        price: price.unit_amount ?? 0,
        isActive: !!price.active,
      });
    });
  }
}
