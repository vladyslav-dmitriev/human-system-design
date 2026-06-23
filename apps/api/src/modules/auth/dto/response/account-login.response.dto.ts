import { Expose } from 'class-transformer';

export class AccountLoginResponseDto {
  @Expose()
  success: boolean;

  @Expose()
  twoFactorEnabled: boolean;

  @Expose()
  phone: string;

  @Expose()
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}
