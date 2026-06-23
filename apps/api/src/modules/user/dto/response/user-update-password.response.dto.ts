import { IsBoolean } from 'class-validator';

export class UserUpdatePasswordResponseDto {
  @IsBoolean()
  success: boolean;
}
