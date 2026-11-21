import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCode } from '../errors';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  const run = (exception: unknown, headersSent = false) => {
    const json = jest.fn<void, [Record<string, unknown>]>();
    const status = jest.fn<{ json: typeof json }, [number]>(() => ({ json }));
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => ({ status, headersSent }),
        getRequest: () => ({ method: 'GET', url: '/x' }),
      }),
    };

    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(exception, host as never);

    return {
      status: status.mock.calls[0]?.[0],
      body: json.mock.calls[0]?.[0],
      status_: status,
    };
  };

  it('keeps an explicit code from the exception', () => {
    const { status, body } = run(
      new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      }),
    );

    expect(status).toBe(401);
    expect(body).toEqual({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
      code: ErrorCode.AUTH_INVALID_CREDENTIALS,
    });
  });

  it.each([
    [
      new BadRequestException(['email must be an email']),
      400,
      'VALIDATION_FAILED',
    ],
    [new ForbiddenException(), 403, 'FORBIDDEN'],
    [new NotFoundException('x'), 404, 'NOT_FOUND'],
    [new ConflictException(), 409, 'CONFLICT'],
    [
      new HttpException('slow down', HttpStatus.TOO_MANY_REQUESTS),
      429,
      'RATE_LIMITED',
    ],
    [
      new HttpException('big', HttpStatus.PAYLOAD_TOO_LARGE),
      413,
      'PAYLOAD_TOO_LARGE',
    ],
  ])('adds the default code by status %#', (exception, statusCode, code) => {
    const { status, body } = run(exception);

    expect(status).toBe(statusCode);
    expect(body).toMatchObject({ statusCode, code });
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('error');
  });

  it('keeps the array of validation messages', () => {
    const { body } = run(new BadRequestException(['a is bad', 'b is bad']));

    expect(body?.message).toEqual(['a is bad', 'b is bad']);
  });

  it('maps Prisma P2025 (record not found) to 404 NOT_FOUND', () => {
    const { status, body } = run(
      Object.assign(new Error('Record to delete does not exist.'), {
        name: 'PrismaClientKnownRequestError',
        code: 'P2025',
      }),
    );

    expect(status).toBe(404);
    expect(body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(JSON.stringify(body)).not.toContain('Record to delete');
  });

  it('maps Prisma P2002 (unique violation) to 409 without Prisma text', () => {
    const { status, body } = run(
      Object.assign(
        new Error('Unique constraint failed on the fields: (`email`)'),
        {
          name: 'PrismaClientKnownRequestError',
          code: 'P2002',
        },
      ),
    );

    expect(status).toBe(409);
    expect(JSON.stringify(body)).not.toContain('Unique constraint');
  });

  it('an unknown error gives 500 INTERNAL and leaks neither message nor stack', () => {
    const error = new Error(
      'connect ECONNREFUSED 10.0.0.5:5432 password=hunter2',
    );
    const { status, body } = run(error);

    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
      code: ErrorCode.INTERNAL,
    });
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|hunter2|at .*\.ts/);
  });

  it('a non-Error throw (string) is also a clean 500', () => {
    const { status, body } = run('boom');

    expect(status).toBe(500);
    expect(body?.message).toBe('Internal server error');
  });

  it('an unknown Prisma error code is a 500, not a leak', () => {
    const { status, body } = run(
      Object.assign(new Error('Foreign key constraint failed'), {
        name: 'PrismaClientKnownRequestError',
        code: 'P2003',
      }),
    );

    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('Foreign key');
  });

  it('exposes 4xx errors of http-errors (malformed JSON body) with their status', () => {
    const { status, body } = run(
      Object.assign(new SyntaxError('Unexpected token'), {
        status: 400,
        statusCode: 400,
        expose: true,
      }),
    );

    expect(status).toBe(400);
    expect(body).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
  });

  it('does not write a second response when headers were already sent', () => {
    const { status_ } = run(new Error('late'), true);

    expect(status_).not.toHaveBeenCalled();
  });

  it('rethrows for non-http contexts (e.g. RPC / queue consumers)', () => {
    const host = { getType: () => 'rpc' };

    expect(() => filter.catch(new Error('x'), host as never)).toThrow('x');
  });
});
