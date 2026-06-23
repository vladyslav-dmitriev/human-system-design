import { ProductDto } from './dto';

export class ProductMapper {
  static toDomain(price: any): ProductDto {
    const product = price.product as any;

    if (typeof product === 'string') {
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
