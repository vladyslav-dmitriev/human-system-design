import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const TODO_TITLE_MAX_LENGTH = 200;

export class TodoCreateBodyDto {
  @ApiProperty({
    example: 'Buy milk',
    description: 'Task text (trimmed, 1..200 characters)',
    maxLength: TODO_TITLE_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(TODO_TITLE_MAX_LENGTH)
  title: string;
}
