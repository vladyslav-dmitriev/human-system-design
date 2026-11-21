import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class EmailSuccessResponseDto {
  @ApiProperty()
  @Expose()
  success: boolean;
}
