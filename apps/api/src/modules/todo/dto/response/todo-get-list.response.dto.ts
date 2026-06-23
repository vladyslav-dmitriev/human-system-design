import { Expose, Type } from 'class-transformer';

import { TodoItemDto } from '../common';

export class TodoGetListResponseDto {
  @Expose()
  @Type(() => TodoItemDto)
  items: TodoItemDto[];
}
