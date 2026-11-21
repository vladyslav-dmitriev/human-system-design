import { UsersController } from './users.controller';

jest.mock('../auth/guards/jwt-auth.guard', () => ({ AuthGuard: class {} }));
jest.mock('./user.service', () => ({ UserService: class {} }));
jest.mock('interceptors', () => ({ Serialize: () => () => undefined }), {
  virtual: true,
});

describe('UsersController', () => {
  const service = { setTwoFactor: jest.fn() };
  const controller = new UsersController(service as never);

  // BUG: см. FIX.md «POST user/profile/2fa ничего не возвращает»
  it.failing(
    'setTwoFactor returns the service result to the client',
    async () => {
      service.setTwoFactor.mockResolvedValue({ success: true });

      await expect(
        controller.setTwoFactor('u1', {
          phone: '+1',
          code: '123456',
          twoFactorEnabled: true,
        }),
      ).resolves.toEqual({ success: true });
    },
  );
});
