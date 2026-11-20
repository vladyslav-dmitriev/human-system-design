import type { StripeTypes } from '../payments';
import { ProductDto } from './dto';

export class ProductMapper {
  static toDomain(price: StripeTypes.Price): ProductDto {
    const product = price.product;

    // product приходит развёрнутым (expand: ['data.product']); id-строка или
    // удалённый продукт означают, что данных для витрины нет
    if (typeof product === 'string' || 'deleted' in product) {
      throw new Error('Product not found');
    }

    return {
      priceId: price.id,
      productId: product.id,
      type: price.type,
      name: product.name,
      description: product.description,
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
    };
  }
}
