import { Expose } from 'class-transformer';

export class ProductSyncResponseDto {
  @Expose()
  synced: number;
}
