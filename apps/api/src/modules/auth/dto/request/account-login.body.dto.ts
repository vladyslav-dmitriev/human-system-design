import { IsEmail, IsString } from 'class-validator';

export class AccountLoginBodyDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  captchaToken: string;
}
