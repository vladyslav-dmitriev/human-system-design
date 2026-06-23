import { Expose } from 'class-transformer';

export class InvoiceGetListResponseDto {
  @Expose()
  id: string;

  @Expose()
  number: string;

  @Expose()
  amount: number;

  @Expose()
  currency: string;

  @Expose()
  status: string;

  @Expose()
  pdfUrl: string;

  @Expose()
  createdAt: string;
}
