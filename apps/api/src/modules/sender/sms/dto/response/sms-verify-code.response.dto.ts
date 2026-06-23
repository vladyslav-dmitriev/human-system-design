import { Expose } from 'class-transformer';

export class SmsVerifyCodeResponseDto {
  @Expose()
  success: boolean;
}
