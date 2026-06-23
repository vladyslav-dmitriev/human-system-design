import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TodoCreateBodyDto {
  @ApiProperty({
    example: 'Buy milk',
    description: 'Task text',
  })
  @IsString()
  @IsNotEmpty()
  title: string;
}
