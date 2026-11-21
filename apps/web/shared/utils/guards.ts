import { getPathLocale, normalizePath } from "../lib/normalize-path";
import { CALLBACK_URL_PARAM, ROUTE, ROUTES } from "../../constants";

const isSameOrNested = (path: string, route: string) =>
  path === route || path.startsWith(route + "/");

/** Страницы входа и регистрации (путь без локали): точное совпадение */
export function isAuthRoute(path: string) {
  return ROUTES.auth.includes(path);
}

/** Защищённые страницы (путь без локали): сам маршрут и вложенные, по сегментам */
export function isProtectedRoute(path: string) {
  return ROUTES.protected.some((route) => isSameOrNested(path, route));
}

/** Путь для редиректа на логин: `/login?callbackUrl=/settings` (локаль добавляет роутер) */
export function buildLoginHref(path: string, search = "") {
  const params = new URLSearchParams({ [CALLBACK_URL_PARAM]: path + search });
  return `${ROUTE.LOGIN}?${params.toString()}`;
}

/**
 * callbackUrl приходит из URL, ему нельзя верить: допускаем только внутренний
 * путь без локали, не страницу входа (иначе open redirect и петли).
 */
export function getSafeCallbackUrl(value: string | null | undefined) {
  if (!value || !isSafeInternalPath(value)) return ROUTE.DASHBOARD;

  // локаль в callbackUrl не храним: i18n-роутер добавит свою
  const target = getPathLocale(value) ? normalizePath(value) : value;
  // после снятия локали `/uk//evil.example` превращается в `//evil.example`
  if (!isSafeInternalPath(target)) return ROUTE.DASHBOARD;

  const path = target.split(/[?#]/)[0] ?? "";
  if (isAuthRoute(path) || path === ROUTE.FORGOT_PASSWORD)
    return ROUTE.DASHBOARD;

  return target;
}

/** Внутренний путь: начинается с одного `/`, без `\` и управляющих символов */
function isSafeInternalPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("\\")) return false;
  return ![...value].some((ch) => ch.charCodeAt(0) < 32);
}
