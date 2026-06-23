import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

export interface ITodoRepository {
  createTodo(
    title: string,
    userId: string,
    imageUrl: string | null,
  ): Promise<any>;
}

@Injectable()
export class TodoRepository implements ITodoRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getTodoById(todoId: string) {
    return this.prisma.todo.findUnique({
      where: { id: todoId },
    });
  }

  async getUserTodos(
    userId: string,
    query: {
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const { sortBy, sortOrder } = query;

    const items = await this.prisma.todo.findMany({
      where: {
        userId,
      },
      ...(sortBy && {
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      select: {
        id: true,
        title: true,
        completed: true,
        createdAt: true,
        imageUrl: true,
      },
    });

    return { items };
  }

  async createTodo(userId: string, title: string, imageUrl: string) {
    return this.prisma.todo.create({
      data: {
        title,
        userId,
        imageUrl,
      },
    });
  }

  updateTodo(todoId: string, completed: boolean) {
    return this.prisma.todo.update({
      where: { id: todoId },
      data: {
        completed,
      },
    });
  }

  updateTodoImage(userId: string, todoId: string, imageUrl: string) {
    return this.prisma.todo.updateMany({
      where: {
        id: todoId,
        userId,
      },
      data: {
        imageUrl,
      },
    });
  }

  deleteTodo(userId: string, todoId: string) {
    return this.prisma.todo.delete({
      where: {
        id: todoId,
        userId,
      },
    });
  }
}
