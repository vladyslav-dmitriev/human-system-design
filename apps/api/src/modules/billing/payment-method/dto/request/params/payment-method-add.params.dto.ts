import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentMethodAddParamsDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
