import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class TodoGetListQueryDto {
  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Поле, по которому сортируем',
    enum: ['title', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['title', 'createdAt', 'updatedAt']) // Защита: разрешаем сортировать только по этим полям
  sortBy?: string = 'createdAt'; // Значение по умолчанию

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Направление сортировки',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc'; // Значение по умолчанию
}
