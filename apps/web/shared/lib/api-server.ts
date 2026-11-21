import { cookies, headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getApiErrorCode } from "./api-error";
import { SESSION_EXPIRED_PARAM } from "../../constants";
import { buildLoginHref } from "../utils/guards";
import { normalizePath } from "./normalize-path";

/** Редирект на логин текущей локали; proxy сбросит протухшую cookie по `sessionExpired` */
export async function redirectToLogin(): Promise<never> {
  const locale = await getLocale();
  const requested = (await headers()).get("next-url");
  const login = requested
    ? buildLoginHref(normalizePath(requested.split("?")[0] ?? "/"))
    : buildLoginHref("/dashboard");

  redirect(`/${locale}${login}&${SESSION_EXPIRED_PARAM}=1`);
}

/**
 * `fetch` для серверных компонентов: подставляет cookie запроса и на
 * `401 UNAUTHORIZED` редиректит на логин. `redirect` бросает исключение, поэтому
 * в `catch` вызывающего кода нужен `unstable_rethrow(error)`.
 */
export async function serverApiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const cookieString = (await cookies()).toString();

  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      Cookie: cookieString,
    },
  });

  if (response.status === 401) {
    const code = await getApiErrorCode(response.clone());
    if (code === "UNAUTHORIZED") await redirectToLogin();
  }

  return response;
}

export { unstable_rethrow };
