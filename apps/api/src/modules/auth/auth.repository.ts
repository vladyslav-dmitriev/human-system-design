import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

interface IAuthRepository {
  getUserCredentials(email: string): Promise<{ password: string } | null>;
}

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getUserCredentials(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
      },
    });
  }

  async getUserLogin(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,

        authSettings: {
          select: {
            twoFactorEnabled: true,
          },
        },

        profile: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });
  }
}
