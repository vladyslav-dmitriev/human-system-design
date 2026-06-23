import { IsBoolean, IsNotEmpty } from 'class-validator';

export class SubscriptionRenewBodyDto {
  @IsNotEmpty()
  @IsBoolean()
  autoRenew!: boolean;
}
