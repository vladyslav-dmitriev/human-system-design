import { Optional } from '@nestjs/common';
import { Expose } from 'class-transformer';

export class AccountCreateResponseDto {
  @Expose()
  @Optional()
  success?: boolean;

  @Expose()
  @Optional()
  error?: string;
}
