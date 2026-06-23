import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentIntentGetParamsDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
