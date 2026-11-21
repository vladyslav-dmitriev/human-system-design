import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SmsSendCodeResponseDto {
  @ApiProperty()
  @Expose()
  success: boolean;
}
