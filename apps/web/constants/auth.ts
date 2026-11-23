/**
 * Имя cookie сессии next-auth: одно место для auth.ts и proxy.ts.
 * Контракт с api (apps/api/src/modules/auth/session-cookie.ts): в production api принимает
 * только `__Secure-authjs.session-token` (имя же служит salt при расшифровке JWT), любое другое имя даёт 401.
 */
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "next-auth.session-token";

/** Query-параметр со страницей возврата после входа */
export const CALLBACK_URL_PARAM = "callbackUrl";

/** Query-параметр: api отозвал сессию, proxy сбрасывает cookie на странице входа */
export const SESSION_EXPIRED_PARAM = "sessionExpired";

/** Срок жизни сессии next-auth (JWT и cookie): 7 дней, в секундах */
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
