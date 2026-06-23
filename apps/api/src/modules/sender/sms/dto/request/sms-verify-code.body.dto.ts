import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class SmsVerifyCodeBodyDto {
  @IsPhoneNumber()
  phoneNumber: string;

  @IsString()
  @Length(6)
  code: string;
}
