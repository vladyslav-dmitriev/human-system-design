import { Expose, Type } from 'class-transformer';

import { UserJWTTokenDto } from '../common';

export class AccountTwoFactorResponseDto {
  @Expose()
  success: boolean;

  @Type(() => UserJWTTokenDto)
  user: UserJWTTokenDto;
}
