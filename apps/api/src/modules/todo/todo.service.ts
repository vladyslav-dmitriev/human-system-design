import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TodoRepository } from './todo.repository';
import {
  TodoCreateBodyDto,
  TodoDeleteParamsDto,
  TodoGetListQueryDto,
  TodoUpdateBodyDto,
  TodoUpdateParamsDto,
  TodoUploadImageBodyDto,
} from './dto';

@Injectable()
export class TodoService {
  constructor(@Inject(TodoRepository) private todoRepository: TodoRepository) {}

  async getUserTodos(userId: string, query: TodoGetListQueryDto) {
    return this.todoRepository.getUserTodos(userId, query);
  }

  async createTodo(
    userId: string,
    body: TodoCreateBodyDto,
    imageUrl: string | null,
  ) {
    return this.todoRepository.createTodo(userId, body.title, imageUrl ?? '');
  }

  async updateTodo(
    userId: string,
    params: TodoUpdateParamsDto,
    body: TodoUpdateBodyDto,
  ) {
    const { todoId } = params;

    const todo = await this.todoRepository.getTodoById(todoId);

    if (!todo) {
      throw new NotFoundException('Task not found');
    }

    if (todo.userId !== userId) {
      throw new ForbiddenException(
        'У вас нет прав на редактирование этой задачи',
      );
    }

    return this.todoRepository.updateTodo(todoId, body.completed);
  }

  async deleteTodo(userId: string, params: TodoDeleteParamsDto) {
    return this.todoRepository.deleteTodo(userId, params.todoId);
  }

  async updateTodoImage(
    userId: string,
    imageUrl: string,
    body: TodoUploadImageBodyDto,
  ): Promise<void> {
    const result = await this.todoRepository.updateTodoImage(
      userId,
      body.todoId,
      imageUrl,
    );

    if (result.count === 0) {
      throw new NotFoundException(
        'Задача не найдена или у вас нет прав на её изменение',
      );
    }
  }
}
