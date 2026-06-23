import { Expose, Type } from 'class-transformer';

import { UserJWTTokenDto } from '../common';

export class AccountValidateResponseDto {
  @Expose()
  @Type(() => UserJWTTokenDto)
  user: UserJWTTokenDto;
}
