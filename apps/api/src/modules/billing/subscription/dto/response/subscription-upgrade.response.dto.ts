import { Expose } from 'class-transformer';

export class SubscriptionUpgradeResponseDto {
  @Expose()
  clientSecret: null | string;

  @Expose()
  amount: number;

  @Expose()
  currency: string;

  @Expose()
  productName: string;
}
