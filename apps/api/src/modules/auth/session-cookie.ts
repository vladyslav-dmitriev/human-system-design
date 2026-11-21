export const SECURE_SESSION_COOKIE = '__Secure-authjs.session-token';

const DEV_SESSION_COOKIES = [
  'authjs.session-token',
  SECURE_SESSION_COOKIE,
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

/**
 * Какие имена cookie сессии принимаем. В production только `__Secure-` вариант:
 * его нельзя выставить с поддомена или по http, обычное имя там подделать проще.
 */
export function getSessionCookieNames(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return env.NODE_ENV === 'production'
    ? [SECURE_SESSION_COOKIE]
    : DEV_SESSION_COOKIES;
}
