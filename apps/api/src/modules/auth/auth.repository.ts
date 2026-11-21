import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

const userLoginSelect = {
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
} as const;

@Injectable()
export class AuthRepository {
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
      select: userLoginSelect,
    });
  }

  async getUserLoginById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userLoginSelect,
    });
  }
}
