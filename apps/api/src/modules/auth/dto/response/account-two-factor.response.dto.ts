import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AccountTwoFactorResponseDto {
  @ApiProperty()
  @Expose()
  loginTicket: string;
}
