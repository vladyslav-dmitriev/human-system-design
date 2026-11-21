import { Expose, Type } from 'class-transformer';

class Metadata {
  @Expose()
  name: string;

  @Expose()
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
