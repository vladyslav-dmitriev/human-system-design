import { IsEmail, IsString, Length } from 'class-validator';

export class AccountTwoFactorBodyDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @Length(6)
  code: string;

  @IsString()
  captchaToken: string;
}
