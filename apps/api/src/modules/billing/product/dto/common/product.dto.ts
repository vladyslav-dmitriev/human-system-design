export class ProductDto {
  priceId: string;
  productId: string;
  type: string;
  name: string;
  description: string | null;
  amount: number | null;
  currency: string;
  interval: string | undefined;
}
