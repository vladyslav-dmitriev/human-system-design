import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserUpdateEmailResponseDto {
  @ApiProperty()
  @Expose()
  success: boolean;
}
