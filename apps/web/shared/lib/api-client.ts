import { signOut } from "next-auth/react";

import { getPathLocale, normalizePath } from "./normalize-path";
import { getApiErrorCode } from "./api-error";
import { SESSION_EXPIRED_PARAM } from "../../constants";
import { buildLoginHref } from "../utils/guards";

let redirecting = false;

/**
 * Сессия отозвана api (`401 UNAUTHORIZED`, например после смены пароля):
 * завершаем сессию next-auth и ведём на логин той же локали с callbackUrl.
 */
export async function expireSession() {
  if (typeof window === "undefined" || redirecting) return;
  redirecting = true;

  try {
    await signOut({ redirect: false });
  } catch {
    // cookie всё равно сбросит proxy на странице логина (sessionExpired)
  }

  const { pathname, search } = window.location;
  const locale = getPathLocale(pathname);
  const prefix = locale ? `/${locale}` : "";
  const login = buildLoginHref(normalizePath(pathname), search);

  window.location.assign(`${prefix}${login}&${SESSION_EXPIRED_PARAM}=1`);
}

/**
 * `fetch` для запросов браузера к api: на `401 UNAUTHORIZED` выходит из сессии
 * и редиректит на логин. Ответ возвращается как есть (тело не потреблено).
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    const code = await getApiErrorCode(response.clone());
    if (code === "UNAUTHORIZED") await expireSession();
  }

  return response;
}
