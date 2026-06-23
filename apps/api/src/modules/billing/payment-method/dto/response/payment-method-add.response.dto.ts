import { Expose } from 'class-transformer';

export class PaymentMethodAddResponseDto {
  @Expose()
  success: boolean;
}
