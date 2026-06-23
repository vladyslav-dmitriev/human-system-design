import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CheckoutCreateBodyDto {
  @IsString()
  @IsNotEmpty()
  priceId: string;

  @IsString()
  @IsIn(['subscription', 'one-payment'])
  type: 'subscription' | 'one-payment';
}
