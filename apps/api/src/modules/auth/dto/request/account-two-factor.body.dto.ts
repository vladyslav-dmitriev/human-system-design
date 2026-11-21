import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AccountTwoFactorBodyDto {
  @ApiProperty({ description: 'otpChallenge из ответа login' })
  @IsString()
  @Length(20, 200)
  otpChallenge: string;

  @ApiProperty({ minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code: string;
}
