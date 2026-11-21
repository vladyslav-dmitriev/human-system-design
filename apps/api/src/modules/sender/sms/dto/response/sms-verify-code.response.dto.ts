import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SmsVerifyCodeResponseDto {
  @ApiProperty()
  @Expose()
  success: boolean;
}
