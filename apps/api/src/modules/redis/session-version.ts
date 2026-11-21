import type Redis from 'ioredis';

/**
 * Версия сессий пользователя: `session-version:<userId>` в Redis (нет ключа = 0).
 * Web кладёт версию в JWT при входе, `AuthGuard` сверяет её с Redis; `INCR`
 * при смене пароля, email и 2FA отзывает все ранее выданные сессии.
 */
export const sessionVersionKey = (userId: string) =>
  `session-version:${userId}`;

export async function getSessionVersion(
  redis: Pick<Redis, 'get'>,
  userId: string,
): Promise<number> {
  const raw = await redis.get(sessionVersionKey(userId));
  const version = raw === null ? 0 : Number(raw);

  return Number.isInteger(version) && version >= 0 ? version : 0;
}

export async function bumpSessionVersion(
  redis: Pick<Redis, 'incr'>,
  userId: string,
): Promise<number> {
  return redis.incr(sessionVersionKey(userId));
}
