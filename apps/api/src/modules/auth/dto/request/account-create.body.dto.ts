import { IsEmail, IsIn, IsString } from 'class-validator';

export class AccountCreateBodyDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsIn(['en', 'uk'])
  locale: 'en' | 'uk';

  @IsString()
  captchaToken: string;
}
