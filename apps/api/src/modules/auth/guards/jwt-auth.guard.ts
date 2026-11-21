import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { decode, type JWT } from '@auth/core/jwt';
import type Redis from 'ioredis';

import type { AuthenticatedRequest } from '../decorators/get-user.decorator';
import { REDIS_CLIENT, getSessionVersion } from '../../redis';
import { getSessionCookieNames } from '../session-cookie';
import { ErrorCode } from '../../../common/errors';

const unauthorized = (message: string) =>
  new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message });

/** Версия сессии из токена: поля нет (старые сессии) = 0. */
const tokenSessionVersion = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : 0;

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = (request.cookies ?? {}) as Record<
      string,
      string | undefined
    >;

    const cookieName = getSessionCookieNames().find((name) => cookies[name]);

    if (!cookieName) {
      throw unauthorized('Session cookie is missing');
    }

    const sessionToken = cookies[cookieName];
    let payload: JWT | null;

    try {
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

      if (!secret) {
        throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is not set');
      }

      payload = await decode({
        token: sessionToken,
        secret: secret,
        salt: cookieName,
      });
    } catch (error) {
      // Только сообщение: стек и токен на каждый невалидный запрос в лог не пишем
      this.logger.warn(
        `Session decode failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw unauthorized('Invalid session token');
    }

    if (!payload) {
      throw unauthorized('Invalid session token');
    }

    const userId = (payload.id as string | undefined) || payload.sub;

    if (!userId) {
      throw unauthorized('Invalid session token');
    }

    // Отзыв сессий: смена пароля, email и 2FA увеличивают версию в Redis.
    // Redis недоступен: 503, чтобы не пропускать отозванные сессии (и не выбрасывать пользователей на логин).
    let currentVersion: number;

    try {
      currentVersion = await getSessionVersion(this.redis, userId);
    } catch (error) {
      this.logger.warn(
        `Session version lookup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new ServiceUnavailableException({
        code: ErrorCode.INTERNAL,
        message: 'Session store is unavailable',
      });
    }

    if (tokenSessionVersion(payload.sessionVersion) !== currentVersion) {
      throw unauthorized('Session has been revoked');
    }

    request.user = {
      id: userId,
      email: payload.email,
      name: payload.name,
      role: payload.role as string | undefined,
    };

    return true;
  }
}
