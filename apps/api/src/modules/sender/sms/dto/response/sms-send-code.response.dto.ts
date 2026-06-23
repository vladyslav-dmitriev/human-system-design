import { Expose } from 'class-transformer';

export class SmsSendCodeResponseDto {
  @Expose()
  success: boolean;
}
