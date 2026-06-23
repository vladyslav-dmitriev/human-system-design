import { IsString } from 'class-validator';

export class AccountValidateBodyDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}
