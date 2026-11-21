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
    try {
      return await this.todoRepository.deleteTodo(userId, params.todoId);
    } catch (error) {
      // Prisma P2025: запись не найдена (или чужая): отдаём 404, а не 500
      if ((error as { code?: string } | null)?.code === 'P2025') {
        throw new NotFoundException('Task not found');
      }

      throw error;
    }
  }

  /** Чужая и несуществующая задача неотличимы: обе дают 404 */
  async assertTodoOwner(userId: string, todoId: string): Promise<void> {
    const todo = await this.todoRepository.getTodoById(todoId);

    if (!todo || todo.userId !== userId) {
      throw new NotFoundException('Task not found');
    }
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
