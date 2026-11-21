import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { TodoService } from './todo.service';

jest.mock('./todo.repository', () => ({ TodoRepository: class {} }));

describe('TodoService', () => {
  const repo = {
    getUserTodos: jest.fn(),
    createTodo: jest.fn(),
    getTodoById: jest.fn(),
    updateTodo: jest.fn(),
    deleteTodo: jest.fn(),
    updateTodoImage: jest.fn(),
  };
  const service = new TodoService(repo as never);

  beforeEach(() => jest.resetAllMocks());

  it('lists todos scoped to the caller', async () => {
    repo.getUserTodos.mockResolvedValue({ items: [] });

    await service.getUserTodos('u1', { sortBy: 'createdAt' });

    expect(repo.getUserTodos).toHaveBeenCalledWith('u1', {
      sortBy: 'createdAt',
    });
  });

  it('creates a todo for the caller and stores "" when there is no image', async () => {
    await service.createTodo('u1', { title: 'T' }, null);

    expect(repo.createTodo).toHaveBeenCalledWith('u1', 'T', '');
  });

  describe('updateTodo', () => {
    const params = { todoId: 't1' };
    const body = { completed: true };

    it('updates the owner todo', async () => {
      repo.getTodoById.mockResolvedValue({ id: 't1', userId: 'u1' });
      repo.updateTodo.mockResolvedValue({ id: 't1', completed: true });

      await service.updateTodo('u1', params, body);

      expect(repo.updateTodo).toHaveBeenCalledWith('t1', true);
    });

    it('allows setting completed=false (falsy value is not ignored)', async () => {
      repo.getTodoById.mockResolvedValue({ id: 't1', userId: 'u1' });

      await service.updateTodo('u1', params, { completed: false });

      expect(repo.updateTodo).toHaveBeenCalledWith('t1', false);
    });

    it('throws NotFound for a missing todo', async () => {
      repo.getTodoById.mockResolvedValue(null);

      await expect(
        service.updateTodo('u1', params, body),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.updateTodo).not.toHaveBeenCalled();
    });

    it('throws Forbidden (IDOR) for somebody else todo and writes nothing', async () => {
      repo.getTodoById.mockResolvedValue({ id: 't1', userId: 'other' });

      await expect(
        service.updateTodo('u1', params, body),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.updateTodo).not.toHaveBeenCalled();
    });
  });

  describe('deleteTodo', () => {
    it('passes the caller id to the repository so the delete is owner-scoped', async () => {
      await service.deleteTodo('u1', { todoId: 't1' });

      expect(repo.deleteTodo).toHaveBeenCalledWith('u1', 't1');
    });

    it('answers NotFound when the repository finds nothing to delete (Prisma P2025)', async () => {
      repo.deleteTodo.mockRejectedValue(
        Object.assign(new Error('Record to delete does not exist.'), {
          code: 'P2025',
        }),
      );

      await expect(
        service.deleteTodo('u1', { todoId: 'foreign' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not hide other repository errors', async () => {
      repo.deleteTodo.mockRejectedValue(new Error('db down'));

      await expect(service.deleteTodo('u1', { todoId: 't1' })).rejects.toThrow(
        'db down',
      );
    });
  });

  describe('updateTodoImage', () => {
    it('passes owner scope and resolves when a row was updated', async () => {
      repo.updateTodoImage.mockResolvedValue({ count: 1 });

      await expect(
        service.updateTodoImage('u1', 'https://img', { todoId: 't1' }),
      ).resolves.toBeUndefined();
      expect(repo.updateTodoImage).toHaveBeenCalledWith(
        'u1',
        't1',
        'https://img',
      );
    });

    it('throws NotFound when the todo is not the caller own (count 0)', async () => {
      repo.updateTodoImage.mockResolvedValue({ count: 0 });

      await expect(
        service.updateTodoImage('u1', 'https://img', { todoId: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
