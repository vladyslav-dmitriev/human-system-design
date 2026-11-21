import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

import { IsNewPassword, NormalizeEmail } from '../common';

export class AccountCreateBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Нормализуется: trim + lowercase' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, description: 'От 8 символов до 72 байт UTF-8' })
  @IsNewPassword()
  password: string;

  @ApiProperty({ enum: ['en', 'uk'] })
  @IsString()
  @IsIn(['en', 'uk'])
  locale: 'en' | 'uk';

  @ApiProperty()
  @IsString()
  captchaToken: string;
}
