import { IsNotEmpty, IsString } from 'class-validator';

export class TodoUpdateParamsDto {
  @IsString()
  @IsNotEmpty()
  todoId: string;
}
