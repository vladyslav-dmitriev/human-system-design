import { Expose } from 'class-transformer';

export class SubscriptionDto {
  @Expose()
  id: string;

  @Expose()
  stripeSubscriptionId: string;

  @Expose()
  stripePriceId: string;

  @Expose()
  status: string;

  @Expose()
  autoRenew: boolean;

  @Expose()
  currentPeriodEnd: boolean;
}
