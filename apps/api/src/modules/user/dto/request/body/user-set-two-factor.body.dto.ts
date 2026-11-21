import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class UserSetTwoFactorBodyDto {
  @ApiProperty({ description: 'Номер в формате E.164' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty()
  @IsBoolean()
  twoFactorEnabled: boolean;

  @ApiProperty({ description: 'Текущий пароль (для включения и выключения)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  currentPassword: string;
}
