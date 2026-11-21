import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

import { NormalizeEmail } from '../common';

export class AccountLoginBodyDto {
  @ApiProperty({ description: 'Нормализуется: trim + lowercase' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  password: string;

  @ApiProperty()
  @IsString()
  captchaToken: string;
}
