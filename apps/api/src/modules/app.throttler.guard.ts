import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { decode } from '@auth/core/jwt';

import { getForwardedClientIp } from './auth/internal-auth';
import { getSessionCookieNames } from './auth/session-cookie';

const AUTH_PATH_PREFIX = '/service-auth';

/**
 * Ключ rate limit.
 * - IP клиента: `req.ip` (Express считает его с учётом `trust proxy`, см. main.ts);
 *   если запрос пришёл от сервера web с верным `X-Internal-Secret`, берётся `X-Client-IP`
 *   (иначе все пользователи SSR делили бы один IP сервера web).
 * - `service-auth/*` всегда по IP: подделанная cookie не должна давать отдельный
 *   «бесплатный» счётчик на каждый запрос.
 * - Остальное: для авторизованных `user:<id>` (проверенная сессия), иначе IP.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = `ip:${getForwardedClientIp(req) ?? (req.ip as string | undefined) ?? 'unknown'}`;

    if (this.isAuthPath(req)) {
      return ip;
    }

    const userId = await this.getUserId(req);

    return userId ? `user:${userId}` : ip;
  }

  private isAuthPath(req: Record<string, any>): boolean {
    const url = String(req.originalUrl ?? req.url ?? '');
    const path = url.split('?')[0];

    return path === AUTH_PATH_PREFIX || path.startsWith(`${AUTH_PATH_PREFIX}/`);
  }

  private async getUserId(req: Record<string, any>): Promise<string | null> {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const cookieName = getSessionCookieNames().find((name) => cookies[name]);
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

    if (!cookieName || !secret) {
      return null;
    }

    try {
      const payload = await decode({
        token: cookies[cookieName],
        secret,
        salt: cookieName,
      });
      const id = (payload?.id as string | undefined) || payload?.sub;

      return id ?? null;
    } catch {
      return null;
    }
  }
}
