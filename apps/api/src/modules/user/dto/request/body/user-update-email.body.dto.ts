import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { NormalizeEmail } from '../../../../auth/dto/common';

export class UserUpdateEmailBodyDto {
  @ApiProperty({ description: 'Новый email, нормализуется: trim + lowercase' })
  @NormalizeEmail()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Текущий пароль для подтверждения смены' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  currentPassword: string;
}
