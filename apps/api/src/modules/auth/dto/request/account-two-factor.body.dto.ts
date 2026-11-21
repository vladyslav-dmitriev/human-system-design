import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

import { NormalizeEmail } from '../common';

export class AccountTwoFactorBodyDto {
  @ApiProperty({ description: 'Нормализуется: trim + lowercase' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiPropertyOptional({
    description: 'Не используется, оставлено для совместимости',
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
