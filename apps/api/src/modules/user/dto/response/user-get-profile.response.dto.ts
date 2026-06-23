import { Expose, Type } from 'class-transformer';

export class ProfileDto {
  @Expose()
  name: string;

  @Expose()
  phone: string;
}

export class SettingsDto {
  @Expose()
  isVerified: string;

  @Expose()
  verifiedToken: string;

  @Expose()
  twoFactorEnabled: boolean;
}

export class UserGetProfileResponseDto {
  @Expose()
  email: string;

  @Expose()
  @Type(() => ProfileDto)
  profile: ProfileDto[];

  @Expose()
  @Type(() => SettingsDto)
  authSettings: SettingsDto[];
}
