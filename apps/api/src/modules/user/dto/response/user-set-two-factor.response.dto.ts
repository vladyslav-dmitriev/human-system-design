import { Expose } from 'class-transformer';

export class UserSetTwoFactorResponseDto {
  @Expose()
  success: boolean;
}
