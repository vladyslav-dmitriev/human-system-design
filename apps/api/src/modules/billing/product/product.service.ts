import { Inject } from '@nestjs/common';

import { CACHE } from 'config/cache.config';

import { CacheService } from '../../cache';
import { ProductMapper } from './product.mapper';
import { PaymentsService, type StripeTypes } from '../payments';
import { ProductRepository } from './product.repository';

type ProductsResult = {
  recurring: ReturnType<typeof ProductMapper.toDomain>[];
  oneTime: ReturnType<typeof ProductMapper.toDomain>[];
};

export class ProductService {
  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(ProductRepository)
    private readonly productRepository: ProductRepository,
    @Inject(CacheService) private readonly cacheService: CacheService,
  ) {}

  async getProducts() {
    const cached = await this.cacheService.get<ProductsResult>(
      CACHE.AvailablePlans,
    );

    if (cached) return cached;

    const allPrices = await this.paymentsService.getPricesList();

    const result: ProductsResult = {
      recurring: allPrices.data
        .filter((p) => p.type === 'recurring')
        .map((p) => ProductMapper.toDomain(p)),
      oneTime: allPrices.data
        .filter((p) => p.type === 'one_time')
        .map((p) => ProductMapper.toDomain(p)),
    };

    await this.cacheService.set(CACHE.AvailablePlans, result, 3600);

    return result;
  }

  async syncProducts() {
    const allPrices = await this.paymentsService.getPricesList();

    await Promise.all(
      allPrices.data.map((price) =>
        this.productRepository.upsertProduct({
          stripePriceId: price.id,
          // getPricesList запрашивает expand: ['data.product']
          name: (price.product as StripeTypes.Product).name,
          price: price.unit_amount ?? 0,
          isActive: !!price.active,
        }),
      ),
    );

    // Цены изменились — сбрасываем кэш списка планов.
    await this.cacheService.del(CACHE.AvailablePlans);
  }
}
