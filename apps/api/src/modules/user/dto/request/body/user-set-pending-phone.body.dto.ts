import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class UserSetPendingPhoneBodyDto {
  @ApiProperty({ description: 'Номер для включения 2FA, формат E.164' })
  @IsPhoneNumber()
  phone: string;
}
