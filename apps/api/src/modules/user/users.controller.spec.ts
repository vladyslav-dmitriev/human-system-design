import { UsersController } from './users.controller';

jest.mock('../auth/guards/jwt-auth.guard', () => ({ AuthGuard: class {} }));
jest.mock('./user.service', () => ({ UserService: class {} }));
jest.mock('interceptors', () => ({ Serialize: () => () => undefined }), {
  virtual: true,
});

describe('UsersController', () => {
  const service = {
    setTwoFactor: jest.fn(),
    setPendingPhone: jest.fn(),
    updateEmail: jest.fn(),
  };
  const controller = new UsersController(service as never);

  it('setTwoFactor returns the service result to the client', async () => {
    service.setTwoFactor.mockResolvedValue({ success: true });

    await expect(
      controller.setTwoFactor('u1', {
        phone: '+1',
        code: '123456',
        twoFactorEnabled: true,
        currentPassword: 'pw',
      }),
    ).resolves.toEqual({ success: true });
    expect(service.setTwoFactor).toHaveBeenCalledWith('u1', {
      phone: '+1',
      code: '123456',
      twoFactorEnabled: true,
      currentPassword: 'pw',
    });
  });

  it('setPendingPhone passes only the session user id and the phone', async () => {
    service.setPendingPhone.mockResolvedValue({ success: true });

    await controller.setPendingPhone('u1', { phone: '+380501234567' });

    expect(service.setPendingPhone).toHaveBeenCalledWith('u1', '+380501234567');
  });

  it('updateEmail uses the id from the session', async () => {
    service.updateEmail.mockResolvedValue({ success: true });
    const body = { email: 'a@b.dev', currentPassword: 'x' };

    await controller.updateEmail('session-user', body, 'uk-UA,uk;q=0.9');

    expect(service.updateEmail).toHaveBeenCalledWith(
      'session-user',
      body,
      'uk',
    );
  });
});
