import { ROUTES } from "../../constants";

export function isAuthRoute(path: string) {
  return ROUTES.auth.includes(path);
}

export function isProtectedRoute(path: string) {
  return ROUTES.protected.some((route) => path.startsWith(route));
}
