/** Имя cookie сессии next-auth: одно место для auth.ts и proxy.ts */
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

/** Query-параметр со страницей возврата после входа */
export const CALLBACK_URL_PARAM = "callbackUrl";

/** Query-параметр: api отозвал сессию, proxy сбрасывает cookie на странице входа */
export const SESSION_EXPIRED_PARAM = "sessionExpired";
