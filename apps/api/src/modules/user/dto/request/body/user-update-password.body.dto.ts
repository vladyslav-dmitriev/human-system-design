import { IsNotEmpty, MinLength } from 'class-validator';

export class UserUpdatePasswordBodyDto {
  @IsNotEmpty({ message: 'Введите текущий пароль' })
  currentPassword: string;

  @IsNotEmpty({ message: 'Введите новый пароль' })
  @MinLength(8, { message: 'Новый пароль должен быть не менее 8 символов' })
  newPassword: string;
}
