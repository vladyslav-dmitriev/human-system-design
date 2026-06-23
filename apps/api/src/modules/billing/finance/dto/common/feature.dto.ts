import { Expose } from 'class-transformer';

export class FeatureDto {
  @Expose()
  id: string;

  @Expose()
  expiresAt: string;

  @Expose()
  name: string;

  @Expose()
  isActive: boolean;
}
