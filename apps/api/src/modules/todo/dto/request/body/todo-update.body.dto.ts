import { IsBoolean } from 'class-validator';

export class TodoUpdateBodyDto {
  @IsBoolean()
  completed: boolean;
}
