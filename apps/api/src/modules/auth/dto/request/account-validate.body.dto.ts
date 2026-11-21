import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AccountValidateBodyDto {
  @ApiProperty({ description: 'Одноразовый билет из login / verify-otp' })
  @IsString()
  @Length(20, 200)
  loginTicket: string;
}
