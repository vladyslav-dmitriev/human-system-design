import { IsEmail, IsString } from 'class-validator';

export class EmailSendVerificationBodyDto {
  @IsEmail()
  email!: string;

  @IsString()
  token!: string;
}
