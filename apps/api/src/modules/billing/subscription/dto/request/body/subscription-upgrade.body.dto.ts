import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SubscriptionUpgradeBodyDto {
  @IsString()
  @IsNotEmpty()
  priceId: string;

  @IsString()
  @IsIn(['subscription', 'check'])
  type: 'subscription' | 'check';
}
