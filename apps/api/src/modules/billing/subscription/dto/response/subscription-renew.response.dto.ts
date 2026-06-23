import { Expose } from 'class-transformer';

export class SubscriptionRenewResponseDto {
  @Expose()
  success: boolean;

  @Expose()
  autoRenew: boolean;
}
