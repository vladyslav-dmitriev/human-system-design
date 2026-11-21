import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserJWTTokenDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  role: string;

  @ApiProperty({
    description:
      'Версия сессий пользователя; web кладёт её в JWT как `sessionVersion`',
  })
  @Expose()
  sessionVersion: number;
}
