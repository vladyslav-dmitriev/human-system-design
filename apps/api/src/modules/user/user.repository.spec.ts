import { UserRepository } from './user.repository';

jest.mock('prisma/prisma.service', () => ({ PrismaService: class {} }), {
  virtual: true,
});
jest.mock('@prisma/client', () => ({ Prisma: {} }));

describe('UserRepository.createUser', () => {
  const create = jest.fn();
  const prisma = {
    $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
      fn({ user: { create } }),
    ),
  };
  const repo = new UserRepository(prisma as never);

  beforeEach(() => create.mockReset());

  it('creates user, profile and auth settings in one transaction', async () => {
    create.mockResolvedValue({ id: 'u1' });

    await repo.createUser({
      name: 'Ann',
      email: 'a@test.dev',
      password: 'hash',
      verifiedToken: 'tok',
      isVerified: false,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const { data } = create.mock.calls[0][0];

    expect(data.email).toBe('a@test.dev');
    expect(data.password).toBe('hash');
    expect(data.profile.create.name).toBe('Ann');
    expect(data.authSettings.create.isVerified).toBe(false);
  });

  // BUG: см. FIX.md «createUser не сохраняет verifiedToken»
  it.failing(
    'persists the verification token passed by AuthService',
    async () => {
      create.mockResolvedValue({ id: 'u1' });

      await repo.createUser({
        name: 'Ann',
        email: 'a@test.dev',
        password: 'hash',
        verifiedToken: 'tok',
        isVerified: false,
      });

      expect(
        create.mock.calls[0][0].data.authSettings.create.verifiedToken,
      ).toBe('tok');
    },
  );
});
