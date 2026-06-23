import { Expose } from 'class-transformer';

export class PaymentMethodDeleteResponseDto {
  @Expose()
  success: boolean;
}
