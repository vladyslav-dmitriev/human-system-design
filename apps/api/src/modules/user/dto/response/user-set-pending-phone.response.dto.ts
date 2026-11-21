import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserSetPendingPhoneResponseDto {
  @ApiProperty()
  @Expose()
  success: boolean;
}
