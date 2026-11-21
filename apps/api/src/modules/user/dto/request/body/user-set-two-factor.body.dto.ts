import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsPhoneNumber, IsString, Length } from 'class-validator';

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
}
