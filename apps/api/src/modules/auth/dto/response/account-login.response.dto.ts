import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AccountLoginResponseDto {
  @ApiProperty()
  @Expose()
  twoFactorRequired: boolean;

  @ApiPropertyOptional({ description: 'Только если twoFactorRequired = false' })
  @Expose()
  loginTicket?: string;

  @ApiPropertyOptional({ description: 'Только если twoFactorRequired = true' })
  @Expose()
  phoneMasked?: string;

  @ApiPropertyOptional({
    description:
      'Только если twoFactorRequired = true: одноразовый челлендж для verify-otp (TTL 5 минут)',
  })
  @Expose()
  otpChallenge?: string;
}
