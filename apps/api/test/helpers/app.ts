import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import {
  ClassSerializerInterceptor,
  type INestApplication,
  type ModuleMetadata,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AllExceptionsFilter } from '../../src/common/filters';
import { getTrustProxy } from '../../src/config/app.config';

export const TEST_AUTH_SECRET = 'e2e-test-secret-not-a-real-secret-0123456789';

export type TestUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

/**
 * Поднимает Nest-приложение с теми же глобальными настройками, что и main.ts
 * (trust proxy, cookie-parser, AllExceptionsFilter, ValidationPipe whitelist+forbidNonWhitelisted, ClassSerializerInterceptor).
 */
export async function createTestApp(
  metadata: ModuleMetadata,
): Promise<INestApplication> {
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;

  const moduleRef = await Test.createTestingModule(metadata).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });

  (app as NestExpressApplication).set('trust proxy', getTrustProxy());
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'excludeAll',
      exposeDefaultValues: true,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  await app.init();

  return app;
}

const COOKIE_NAME = 'authjs.session-token';

/** Cookie сессии Auth.js, подписанная тестовым секретом (формат как у web). */
export async function sessionCookie(user: TestUser): Promise<string> {
  const { encode } = await import('@auth/core/jwt');
  const token = await encode({
    token: { sub: user.id, id: user.id, ...user },
    secret: TEST_AUTH_SECRET,
    salt: COOKIE_NAME,
  });

  return `${COOKIE_NAME}=${token}`;
}

export const USER_A: TestUser = {
  id: 'user-a',
  email: 'qa-a@example.test',
  name: 'QA A',
  role: 'USER',
};
export const USER_B: TestUser = {
  id: 'user-b',
  email: 'qa-b@example.test',
  name: 'QA B',
  role: 'USER',
};
export const ADMIN: TestUser = {
  id: 'admin-1',
  email: 'qa-admin@example.test',
  name: 'QA Admin',
  role: 'ADMIN',
};
