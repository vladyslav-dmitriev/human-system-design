import { IsBoolean, IsPhoneNumber, IsString, Length } from 'class-validator';

export class UserSetTwoFactorBodyDto {
  @IsPhoneNumber()
  phone: string;

  @IsString()
  @Length(6)
  code: string;

  @IsBoolean()
  twoFactorEnabled: boolean;
}
