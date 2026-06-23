import { IsNotEmpty, IsString } from 'class-validator';

export class TodoDeleteParamsDto {
  @IsString()
  @IsNotEmpty()
  todoId: string;
}
