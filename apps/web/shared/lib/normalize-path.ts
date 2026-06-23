export function normalizePath(pathname: string) {
  const parts = pathname.split("/");

  // /uk/login → ["", "uk", "login"]
  const withoutLocale = parts.slice(2).join("/");

  return "/" + withoutLocale;
}
