import { Expose } from 'class-transformer';

export class CheckoutCreateResponseDto {
  @Expose()
  clientSecret: string | null;

  @Expose()
  amount: number;

  @Expose()
  currency: string;

  @Expose()
  productName: string;
}
