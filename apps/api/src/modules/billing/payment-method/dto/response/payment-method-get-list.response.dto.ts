import { Expose } from 'class-transformer';

export class PaymentMethodGetListResponseDto {
  @Expose()
  id: string;

  @Expose()
  brand: string;

  @Expose()
  last4: string;

  @Expose()
  expMonth: number | undefined;

  @Expose()
  expYear: number | undefined;

  @Expose()
  isDefault: boolean;
}
