import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class EmailVerifyQueryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  token: string;
}
