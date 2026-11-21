import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { UserJWTTokenDto } from '../common';

export class AccountValidateResponseDto {
  @ApiProperty({ type: () => UserJWTTokenDto })
  @Expose()
  @Type(() => UserJWTTokenDto)
  user: UserJWTTokenDto;
}
