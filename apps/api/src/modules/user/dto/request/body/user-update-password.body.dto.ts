import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { IsNewPassword } from '../../../../auth/dto/common';

export class UserUpdatePasswordBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  currentPassword: string;

  @ApiProperty({ minLength: 8, description: 'От 8 символов до 72 байт UTF-8' })
  @IsNewPassword()
  newPassword: string;
}
