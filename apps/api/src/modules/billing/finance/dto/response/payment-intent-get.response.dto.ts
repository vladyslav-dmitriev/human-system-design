import { Expose, Type } from 'class-transformer';

class Metadata {
  name: string;
  type: string;
}

export class PaymentIntentGetResponseDto {
  @Expose()
  amount: number;

  @Expose()
  currency: string;

  @Expose()
  status: string;

  @Expose()
  customer: string;

  @Expose()
  @Type(() => Metadata)
  metadata: Metadata;
}
