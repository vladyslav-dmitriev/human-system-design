import { IsNotEmpty, IsString } from 'class-validator';

export class TodoUploadImageBodyDto {
  @IsString()
  @IsNotEmpty()
  todoId: string;
}
