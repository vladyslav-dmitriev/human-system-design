import { UserRepository } from './user.repository';

jest.mock('prisma/prisma.service', () => ({ PrismaService: class {} }), {
  virtual: true,
});
jest.mock('@prisma/client', () => ({ Prisma: {} }));

describe('UserRepository', () => {
  const create = jest.fn();
  const userUpdate = jest.fn();
  const authSettingsUpdate = jest.fn();
  const profileUpdate = jest.fn();
  const prisma = {
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)({ user: { create } })
        : Promise.all(arg as unknown[]),
    ),
    user: { update: userUpdate },
    authSettings: { update: authSettingsUpdate },
    userProfile: { update: profileUpdate },
  };
  const repo = new UserRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  describe('createUser', () => {
    it('creates user, profile and auth settings in one transaction without a stored token', async () => {
      create.mockResolvedValue({ id: 'u1' });

      await repo.createUser({
        name: 'Ann',
        email: 'a@test.dev',
        password: 'hash',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const { data } = create.mock.calls[0][0];

      expect(data.email).toBe('a@test.dev');
      expect(data.password).toBe('hash');
      expect(data.profile.create.name).toBe('Ann');
      expect(data.authSettings.create.isVerified).toBe(false);
      expect(data.authSettings.create.twoFactorEnabled).toBe(false);
      expect(data.authSettings.create.verifiedToken).toBeNull();
    });
  });

  it('updateUserEmail resets isVerified together with the email', async () => {
    await repo.updateUserEmail('u1', 'new@test.dev');

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        email: 'new@test.dev',
        authSettings: { update: { isVerified: false } },
      },
    });
  });

  it('markEmailVerified sets isVerified and clears the legacy token', async () => {
    await repo.markEmailVerified('u1');

    expect(authSettingsUpdate).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { isVerified: true, verifiedToken: null },
    });
  });

  it('updateUserTwoFactor writes phone and flag in one transaction', async () => {
    await repo.updateUserTwoFactor({
      userId: 'u1',
      phone: null,
      twoFactorEnabled: false,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(profileUpdate).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { phone: null },
    });
    expect(authSettingsUpdate).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { twoFactorEnabled: false },
    });
  });
});
