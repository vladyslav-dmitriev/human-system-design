import {
  InternalServerErrorException,
  type ExecutionContext,
} from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { GetUser } from './get-user.decorator';

// Достаём фабрику параметрического декоратора так, как это делает Nest
function getFactory(data?: string) {
  class Host {
    handler(@GetUser(data as never) _user: unknown) {
      return undefined;
    }
  }

  const meta = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Host,
    'handler',
  ) as Record<
    string,
    { factory: (d: unknown, c: ExecutionContext) => unknown }
  >;

  return Object.values(meta)[0].factory;
}

const ctx = (user: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('GetUser', () => {
  const user = { id: 'u1', email: 'a@test.dev', role: 'USER' };

  it('returns the whole user without a key', () => {
    expect(getFactory()(undefined, ctx(user))).toBe(user);
  });

  it('returns a single field by key', () => {
    expect(getFactory('id')('id', ctx(user))).toBe('u1');
  });

  it('throws 500 when AuthGuard did not populate request.user', () => {
    expect(() => getFactory('id')('id', ctx(undefined))).toThrow(
      InternalServerErrorException,
    );
  });
});
