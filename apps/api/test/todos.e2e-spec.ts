/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

import { TodosController } from '../src/modules/todo/todos.controller';
import { TodoService } from '../src/modules/todo/todo.service';
import { TodoRepository } from '../src/modules/todo/todo.repository';
import { StorageService } from '../src/modules/storage/storage.service';
import { AuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import {
  gifBuffer,
  jpegBuffer,
  pngBuffer,
  svgBuffer,
  webpBuffer,
} from './helpers/images';
import {
  ADMIN,
  createTestApp,
  sessionCookie,
  USER_A,
  USER_B,
} from './helpers/app';

type TodoRow = {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  imageUrl: string;
  createdAt: Date;
};

const MB = 1024 * 1024;

describe('TodosController (nest testing module, in-memory repo)', () => {
  let app: INestApplication;
  let rows: Map<string, TodoRow>;
  let cookieA: string;
  let cookieAdmin: string;
  const storage = { upload: jest.fn() };

  beforeAll(async () => {
    [cookieA, cookieAdmin] = await Promise.all(
      [USER_A, ADMIN].map((u) => sessionCookie(u)),
    );
  });

  beforeEach(async () => {
    storage.upload
      .mockReset()
      .mockResolvedValue('https://s3.example.test/todos/img.png');
    rows = new Map([
      [
        't-a',
        {
          id: 't-a',
          userId: USER_A.id,
          title: 'A todo',
          completed: false,
          imageUrl: '',
          createdAt: new Date(),
        },
      ],
      [
        't-b',
        {
          id: 't-b',
          userId: USER_B.id,
          title: 'B todo',
          completed: false,
          imageUrl: '',
          createdAt: new Date(),
        },
      ],
    ]);
    const repo = {
      getTodoById: async (id: string) => rows.get(id) ?? null,
      getUserTodos: async (userId: string) => ({
        items: [...rows.values()].filter((r) => r.userId === userId),
      }),
      createTodo: async (userId: string, title: string, imageUrl: string) => {
        const row = {
          id: `t-${rows.size + 1}`,
          userId,
          title,
          completed: false,
          imageUrl,
          createdAt: new Date(),
        };
        rows.set(row.id, row);
        return row;
      },
      updateTodo: async (id: string, completed: boolean) => {
        const r = rows.get(id)!;
        r.completed = completed;
        return r;
      },
      updateTodoImage: async (
        userId: string,
        todoId: string,
        imageUrl: string,
      ) => {
        const r = rows.get(todoId);
        if (!r || r.userId !== userId) return { count: 0 };
        r.imageUrl = imageUrl;
        return { count: 1 };
      },
      deleteTodo: async (userId: string, id: string) => {
        const r = rows.get(id);
        if (!r || r.userId !== userId)
          throw Object.assign(new Error('Record to delete does not exist.'), {
            name: 'PrismaClientKnownRequestError',
            code: 'P2025',
          });
        rows.delete(id);
        return r;
      },
    };

    app = await createTestApp({
      controllers: [TodosController],
      providers: [
        TodoService,
        AuthGuard,
        RolesGuard,
        { provide: TodoRepository, useValue: repo },
        { provide: StorageService, useValue: storage },
      ],
    });
  });

  afterEach(() => app.close());

  const http = () => request(app.getHttpServer());

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('401 without a session', () => {
    it.each([
      ['get', '/todos'],
      ['post', '/todos'],
      ['patch', '/todos/t-a'],
      ['delete', '/todos/t-a'],
      ['post', '/todos/upload-image'],
    ])('%s %s -> 401', async (method, url) => {
      await (http() as any)[method](url).expect(401);
    });
  });

  describe('GET /todos', () => {
    it('returns only own todos (no leak of other users)', async () => {
      const res = await http().get('/todos').set('Cookie', cookieA).expect(200);
      expect(res.body.items.map((i: any) => i.id)).toEqual(['t-a']);
      expect(res.body.items[0].userId).toBeUndefined();
    });

    it.each([
      ['sortBy=userId'],
      ['sortBy=password'],
      ['sortBy=title&sortOrder=up'],
      ['sortBy[]=title'],
      ['foo=bar'],
    ])('invalid query ?%s -> 400', async (qs) => {
      await http().get(`/todos?${qs}`).set('Cookie', cookieA).expect(400);
    });

    it.each([
      ['sortBy=title&sortOrder=asc'],
      ['sortBy=createdAt&sortOrder=desc'],
      ['sortBy=updatedAt'],
    ])('valid query ?%s -> 200', async (qs) => {
      await http().get(`/todos?${qs}`).set('Cookie', cookieA).expect(200);
    });
  });

  describe('POST /todos', () => {
    it('creates a todo for the caller from multipart form (as web does)', async () => {
      const res = await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .field('title', 'Buy milk')
        .expect(201);
      expect(res.body).toMatchObject({ title: 'Buy milk', completed: false });
      expect(rows.get(res.body.id)?.userId).toBe(USER_A.id);
    });

    it('userId in body cannot be spoofed (whitelist)', async () => {
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .field('title', 'x')
        .field('userId', USER_B.id)
        .expect(400);
    });

    it.each([[''], ['   ']])('empty title %j -> 400', async (title) => {
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .field('title', title)
        .expect(400);
    });

    it('title is trimmed before saving', async () => {
      const res = await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .send({ title: '  Buy milk  ' })
        .expect(201);
      expect(res.body.title).toBe('Buy milk');
    });

    it('title boundary: 200 chars ok, 201 -> 400, 100k -> 400', async () => {
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .send({ title: 'x'.repeat(200) })
        .expect(201);
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .send({ title: 'x'.repeat(201) })
        .expect(400);
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .send({ title: 'x'.repeat(100_000) })
        .expect(400);
    });

    it('missing title -> 400 with message', async () => {
      const res = await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .field('foo', 'bar')
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining(['title should not be empty']),
      );
    });

    it('JSON body works too', async () => {
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .send({ title: 'json' })
        .expect(201);
    });

    it('web dead component sends {text} -> 400 (create-todo.tsx is not used)', async () => {
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .send({ text: 'x' })
        .expect(400);
    });

    it('png upload: stored by detected type, the file name and declared mime are ignored', async () => {
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .field('title', 'with image')
        .attach('file', pngBuffer(), {
          filename: 'evil.php',
          contentType: 'text/plain',
        })
        .expect(201);
      expect(storage.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/png',
          fileName: expect.stringMatching(/^[0-9a-f-]{36}\.png$/),
        }),
      );
    });

    it.each([
      ['jpg', jpegBuffer, 'image/jpeg'],
      ['webp', webpBuffer, 'image/webp'],
    ])('%s upload is accepted', async (ext, make, contentType) => {
      await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .field('title', 't')
        .attach('file', make(), { filename: `f.${ext}`, contentType })
        .expect(201);
      expect(storage.upload).toHaveBeenCalledWith(
        expect.objectContaining({ contentType }),
      );
    });

    it.each([
      [
        'plain text declared as image/png',
        Buffer.from('plain text, not a PNG'),
        'image/png',
      ],
      [
        '4-byte PNG prefix without IHDR',
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        'image/png',
      ],
      [
        'PHP declared as text/png',
        Buffer.from('<?php system($_GET[0]);'),
        'text/png',
      ],
      ['PDF', Buffer.from('%PDF-1.4\n%....\n'), 'application/pdf'],
      ['SVG (can carry scripts)', svgBuffer(), 'image/svg+xml'],
      ['GIF (not in the allowed list)', gifBuffer(), 'image/gif'],
      [
        'HTML declared as image/jpeg',
        Buffer.from('<html><script>1</script>'),
        'image/jpeg',
      ],
    ])('%s -> 400, nothing uploaded', async (_name, buf, contentType) => {
      const res = await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .field('title', 't')
        .attach('file', buf, { filename: 'f.png', contentType })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(storage.upload).not.toHaveBeenCalled();
      expect(rows.size).toBe(2);
    });

    it('file > 5MB is rejected on create with 413 (like upload-image), nothing uploaded', async () => {
      const res = await http()
        .post('/todos')
        .set('Cookie', cookieA)
        .field('title', 't')
        .attach('file', pngBuffer(6 * MB), {
          filename: 'f.png',
          contentType: 'image/png',
        });
      expect(res.status).toBe(413);
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /todos/:todoId', () => {
    it('owner can complete own todo', async () => {
      const res = await http()
        .patch('/todos/t-a')
        .set('Cookie', cookieA)
        .send({ completed: true })
        .expect(200);
      expect(res.body.completed).toBe(true);
    });

    it('IDOR: another user todo -> 403, data unchanged', async () => {
      await http()
        .patch('/todos/t-b')
        .set('Cookie', cookieA)
        .send({ completed: true })
        .expect(403);
      expect(rows.get('t-b')!.completed).toBe(false);
    });

    it('nonexistent todo -> 404', async () => {
      await http()
        .patch('/todos/nope')
        .set('Cookie', cookieA)
        .send({ completed: true })
        .expect(404);
    });

    it('admin role does not bypass ownership on PATCH', async () => {
      await http()
        .patch('/todos/t-a')
        .set('Cookie', cookieAdmin)
        .send({ completed: true })
        .expect(403);
    });

    it.each([
      [{}],
      [{ completed: 'true' }],
      [{ completed: 1 }],
      [{ completed: null }],
    ])('invalid body %j -> 400', async (body) => {
      await http()
        .patch('/todos/t-a')
        .set('Cookie', cookieA)
        .send(body)
        .expect(400);
    });

    // Решение C3: web шлёт только {completed}, лишние поля по-прежнему 400 (forbidNonWhitelisted)
    it('body with an extra todoId field -> 400 (contract is {completed} only)', async () => {
      await http()
        .patch('/todos/t-a')
        .set('Cookie', cookieA)
        .send({ todoId: 't-a', completed: true })
        .expect(400);
      expect(rows.get('t-a')!.completed).toBe(false);
    });

    it('body exactly as web sends it now ({completed}) is accepted, completed=false too', async () => {
      await http()
        .patch('/todos/t-a')
        .set('Cookie', cookieA)
        .send({ completed: true })
        .expect(200);
      const res = await http()
        .patch('/todos/t-a')
        .set('Cookie', cookieA)
        .send({ completed: false })
        .expect(200);
      expect(res.body.completed).toBe(false);
    });

    it('parallel PATCH of the same todo is idempotent', async () => {
      const results = await Promise.all(
        [1, 2, 3].map(() =>
          http()
            .patch('/todos/t-a')
            .set('Cookie', cookieA)
            .send({ completed: true }),
        ),
      );
      results.forEach((r) => expect(r.status).toBe(200));
      expect(rows.get('t-a')!.completed).toBe(true);
    });
  });

  describe('DELETE /todos/:todoId (ADMIN only)', () => {
    it('regular user -> 403 and todo stays', async () => {
      await http().delete('/todos/t-a').set('Cookie', cookieA).expect(403);
      expect(rows.has('t-a')).toBe(true);
    });

    it('USER cannot delete even own todo (decision: DELETE is ADMIN only) -> 403', async () => {
      const res = await http()
        .delete('/todos/t-a')
        .set('Cookie', cookieA)
        .expect(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(rows.has('t-a')).toBe(true);
    });

    it('admin cannot delete somebody else todo (repo scopes by userId) -> 404, not 500', async () => {
      const res = await http().delete('/todos/t-a').set('Cookie', cookieAdmin);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
      expect(JSON.stringify(res.body)).not.toMatch(/Prisma|Record to delete/);
      expect(rows.has('t-a')).toBe(true);
    });

    it('nonexistent todo -> 404 (not 500)', async () => {
      await http()
        .delete('/todos/does-not-exist')
        .set('Cookie', cookieAdmin)
        .expect(404);
    });

    it('admin deletes own todo -> 200', async () => {
      rows.set('t-admin', {
        id: 't-admin',
        userId: ADMIN.id,
        title: 'admin todo',
        completed: false,
        imageUrl: '',
        createdAt: new Date(),
      });
      await http()
        .delete('/todos/t-admin')
        .set('Cookie', cookieAdmin)
        .expect(200);
      expect(rows.has('t-admin')).toBe(false);
    });
  });

  describe('POST /todos/upload-image', () => {
    const upload = (
      cookie: string,
      todoId: string | undefined,
      file?: { buf: Buffer; type: string },
    ) => {
      let req = http().post('/todos/upload-image').set('Cookie', cookie);
      if (todoId !== undefined) req = req.field('todoId', todoId);
      if (file)
        req = req.attach('file', file.buf, {
          filename: 'f.png',
          contentType: file.type,
        });
      return req;
    };
    const png = (size?: number) => ({
      buf: pngBuffer(size),
      type: 'image/png',
    });

    it('happy path attaches image to own todo', async () => {
      await upload(cookieA, 't-a', png()).expect(201);
      expect(rows.get('t-a')!.imageUrl).toContain('img.png');
    });

    it('responds with { success: true, imageUrl } (web reads data.imageUrl)', async () => {
      const res = await upload(cookieA, 't-a', png()).expect(201);
      expect(res.body).toEqual({
        success: true,
        imageUrl: 'https://s3.example.test/todos/img.png',
      });
    });

    it('no file -> 400', async () => {
      await upload(cookieA, 't-a').expect(400);
    });

    it('no todoId -> 400', async () => {
      await upload(cookieA, undefined, png()).expect(400);
    });

    it('wrong content: HTML declared as image/png -> 400, nothing uploaded or attached', async () => {
      await upload(cookieA, 't-a', {
        buf: Buffer.from('<html></html>'),
        type: 'image/png',
      }).expect(400);
      expect(storage.upload).not.toHaveBeenCalled();
      expect(rows.get('t-a')!.imageUrl).toBe('');
    });

    it('SVG -> 400', async () => {
      await upload(cookieA, 't-a', {
        buf: svgBuffer(),
        type: 'image/svg+xml',
      }).expect(400);
    });

    it('size boundary: exactly 5MB ok, 5MB+1 and 6MB -> 413', async () => {
      await upload(cookieA, 't-a', png(5 * MB)).expect(201);
      await upload(cookieA, 't-a', png(5 * MB + 1)).expect(413);
      await upload(cookieA, 't-a', png(6 * MB)).expect(413);
    });

    it('IDOR: someone else todo -> 404 and image is not attached', async () => {
      await upload(cookieA, 't-b', png()).expect(404);
      expect(rows.get('t-b')!.imageUrl).toBe('');
    });

    it('nothing is uploaded to storage when the todo is not owned', async () => {
      await upload(cookieA, 't-b', png()).expect(404);
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });
});
