import { Expose } from 'class-transformer';

export class UserBillingProfileDto {
  @Expose()
  stripeCustomerId: string;

  @Expose()
  defaultPaymentMethodId: string;

  @Expose()
  currency: string;

  @Expose()
  taxId: string;
}
