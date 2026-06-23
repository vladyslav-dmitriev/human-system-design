import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentMethodDeleteParamsDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
