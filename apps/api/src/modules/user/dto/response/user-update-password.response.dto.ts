import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserUpdatePasswordResponseDto {
  @ApiProperty()
  @Expose()
  success: boolean;
}
