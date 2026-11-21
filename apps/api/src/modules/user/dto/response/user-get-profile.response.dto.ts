import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ProfileDto {
  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty({ description: 'Пустая строка, если номер не задан' })
  @Expose()
  phone: string;
}

export class SettingsDto {
  @ApiProperty()
  @Expose()
  isVerified: boolean;

  @ApiProperty()
  @Expose()
  twoFactorEnabled: boolean;
}

export class UserGetProfileResponseDto {
  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ type: () => ProfileDto })
  @Expose()
  @Type(() => ProfileDto)
  profile: ProfileDto;

  @ApiProperty({ type: () => SettingsDto })
  @Expose()
  @Type(() => SettingsDto)
  authSettings: SettingsDto;
}
