import { Expose } from 'class-transformer';

export class TodoUploadImageResponseDto {
  @Expose()
  success: boolean;

  @Expose()
  imageUrl: string;
}
