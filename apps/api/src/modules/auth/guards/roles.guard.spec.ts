import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';
import { Roles } from '../decorators/roles.decorator';

const ctx = (user: unknown) =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  beforeEach(() => reflector.getAllAndOverride.mockReset());

  it('allows when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(ctx(undefined))).toBe(true);
  });

  it('allows a user with a required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(guard.canActivate(ctx({ role: 'ADMIN' }))).toBe(true);
  });

  it('forbids a user with another role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(ctx({ role: 'USER' }))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids a user without a role and a missing user', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(ctx({ id: '1' }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });

  it('role check is case sensitive', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(ctx({ role: 'admin' }))).toThrow(
      ForbiddenException,
    );
  });

  it('@Roles stores the roles under the "roles" metadata key', () => {
    class Dummy {
      @Roles('ADMIN', 'EDITOR')
      handler() {
        return undefined;
      }
    }

    expect(Reflect.getMetadata('roles', Dummy.prototype.handler)).toEqual([
      'ADMIN',
      'EDITOR',
    ]);
  });
});
