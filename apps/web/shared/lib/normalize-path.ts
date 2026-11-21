import { locales } from "@repo/i18n";

const isLocale = (value: string | undefined): value is string =>
  !!value && (locales as readonly string[]).includes(value);

/** Локаль из первого сегмента пути или `null`, если префикса нет */
export function getPathLocale(pathname: string): string | null {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : null;
}

/** Убирает префикс локали: /uk/login → /login, /uk → /, /login → /login */
export function normalizePath(pathname: string) {
  const parts = pathname.split("/");

  if (!isLocale(parts[1])) return pathname || "/";

  return "/" + parts.slice(2).join("/");
}
