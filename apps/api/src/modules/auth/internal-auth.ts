import { createHash, timingSafeEqual } from 'crypto';
import { isIP } from 'net';

export const INTERNAL_SECRET_HEADER = 'x-internal-secret';
export const CLIENT_IP_HEADER = 'x-client-ip';

type HeaderSource = { headers?: Record<string, unknown> };

const digest = (value: string) => createHash('sha256').update(value).digest();

const headerValue = (req: HeaderSource, name: string): string | undefined => {
  const value = req.headers?.[name];

  return typeof value === 'string' ? value : undefined;
};

/**
 * `X-Internal-Secret` совпадает с `INTERNAL_API_SECRET` (сравнение за постоянное время
 * по sha256-дайджестам). Если секрет не задан, заголовку не верим никогда.
 */
export function hasValidInternalSecret(
  req: HeaderSource,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const expected = env.INTERNAL_API_SECRET;
  const provided = headerValue(req, INTERNAL_SECRET_HEADER);

  if (!expected || !provided) {
    return false;
  }

  return timingSafeEqual(digest(expected), digest(provided));
}

/**
 * Секрет обязателен всегда в production (Joi не даст стартовать без него) и вне
 * production, если он задан. Без секрета вне production validate остаётся открытым:
 * так работают локальная разработка и тесты без web.
 */
export function isInternalSecretRequired(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV === 'production' || Boolean(env.INTERNAL_API_SECRET);
}

/** IP клиента из `X-Client-IP`: только от доверенного сервера web (верный секрет) и только валидный IP. */
export function getForwardedClientIp(
  req: HeaderSource,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!hasValidInternalSecret(req, env)) {
    return null;
  }

  const ip = headerValue(req, CLIENT_IP_HEADER)?.trim();

  return ip && isIP(ip) ? ip : null;
}
