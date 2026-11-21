import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { decode } from '@auth/core/jwt';

const SESSION_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

/**
 * Ключ rate limit: для авторизованных `user:<id>` (проверенная сессия),
 * иначе IP клиента. IP берётся из `req.ip`, который Express считает с учётом
 * `trust proxy` (см. main.ts), а не из адреса nginx.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = await this.getUserId(req);

    if (userId) {
      return `user:${userId}`;
    }

    return `ip:${(req.ip as string | undefined) ?? 'unknown'}`;
  }

  private async getUserId(req: Record<string, any>): Promise<string | null> {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const cookieName = SESSION_COOKIES.find((name) => cookies[name]);
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
