import { Expose, Type } from 'class-transformer';

import { UserBillingProfileDto, SubscriptionDto, FeatureDto } from '../common';

export class UserGetBillingResponseDto {
  @Expose()
  stripeCustomerId: string;

  @Expose()
  defaultPaymentMethodId: string;

  @Expose()
  currency: string;

  @Expose()
  taxId: string;

  @Expose()
  @Type(() => UserBillingProfileDto)
  billing: UserBillingProfileDto;

  @Expose()
  @Type(() => SubscriptionDto)
  subscription: SubscriptionDto;

  @Expose()
  @Type(() => FeatureDto)
  features: FeatureDto[];
}
