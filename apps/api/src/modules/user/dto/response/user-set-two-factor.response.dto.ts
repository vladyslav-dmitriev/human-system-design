import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserSetTwoFactorResponseDto {
  @ApiProperty()
  @Expose()
  success: boolean;
}
