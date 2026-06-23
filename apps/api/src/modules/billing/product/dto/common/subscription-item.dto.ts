import { Expose } from 'class-transformer';

export class SubscriptionItemDto {
  @Expose() priceId: string;
  @Expose() productId: string;
  @Expose() type: string;
  @Expose() name: string;
  @Expose() description: string | null;
  @Expose() amount: number;
  @Expose() currency: string;
  @Expose() interval: string;
}
