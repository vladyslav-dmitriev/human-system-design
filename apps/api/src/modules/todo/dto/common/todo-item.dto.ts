import { Expose } from 'class-transformer';

export class TodoItemDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  completed: boolean;

  @Expose()
  createdAt: string;

  @Expose()
  imageUrl: string;
}
