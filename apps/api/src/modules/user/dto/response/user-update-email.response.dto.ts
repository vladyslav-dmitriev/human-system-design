import { IsBoolean } from 'class-validator';

export class UserUpdateEmailResponseDto {
  @IsBoolean()
  success: boolean;
}
