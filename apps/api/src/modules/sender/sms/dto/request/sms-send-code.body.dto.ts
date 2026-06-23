import { IsPhoneNumber, IsString } from 'class-validator';

export class SmsSendCodeBodyDto {
  @IsPhoneNumber()
  phoneNumber: string;

  @IsString()
  captchaToken: string;
}
