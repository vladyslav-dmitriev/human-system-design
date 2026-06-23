import { IsEmail, IsNotEmpty } from 'class-validator';

export class UserUpdateEmailBodyDto {
  @IsEmail({}, { message: 'Некорректный формат email адреса' })
  @IsNotEmpty({ message: 'Email не может быть пустым' })
  email: string;
}
