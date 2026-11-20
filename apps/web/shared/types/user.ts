/** Ответ GET users/profile (api: UserGetProfileResponseDto) */
export type UserProfile = {
  email: string;
  profile: {
    name: string;
    phone: string;
  };
  authSettings: {
    isVerified: boolean;
    twoFactorEnabled: boolean;
  };
};
