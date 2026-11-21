import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales, routing } from "@repo/i18n";
import { getToken } from "next-auth/jwt";
import { ROUTE, SESSION_COOKIE_NAME, SESSION_EXPIRED_PARAM } from "./constants";
import { getPathLocale, normalizePath } from "./shared/lib/normalize-path";
import {
  buildLoginHref,
  isAuthRoute,
  isProtectedRoute,
} from "./shared/utils/guards";

const intlMiddleware = createMiddleware(routing);

/** Локаль для редиректа: из URL, иначе из cookie next-intl, иначе дефолтная */
function resolveLocale(req: NextRequest, pathname: string) {
  const fromPath = getPathLocale(pathname);
  if (fromPath) return fromPath;

  const fromCookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (fromCookie && (locales as readonly string[]).includes(fromCookie)) {
    return fromCookie;
  }

  return defaultLocale;
}

export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const path = normalizePath(pathname);

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
    cookieName: SESSION_COOKIE_NAME,
  });

  const isLoggedIn = !!token;

  const locale = resolveLocale(req, pathname);

  // api отозвал сессию (401 UNAUTHORIZED): cookie ещё валидна для getToken,
  // поэтому сбрасываем её здесь и пускаем на страницу входа без редиректа в кабинет
  if (
    isLoggedIn &&
    isAuthRoute(path) &&
    req.nextUrl.searchParams.get(SESSION_EXPIRED_PARAM) === "1"
  ) {
    const response = intlMiddleware(req);
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
      ...(process.env.AUTH_COOKIE_DOMAIN
        ? { domain: process.env.AUTH_COOKIE_DOMAIN }
        : {}),
    });
    return response;
  }

  if (isLoggedIn && isAuthRoute(path)) {
    return NextResponse.redirect(
      new URL(`/${locale}${ROUTE.DASHBOARD}`, req.url),
    );
  }

  if (!isLoggedIn && isProtectedRoute(path)) {
    return NextResponse.redirect(
      new URL(`/${locale}${buildLoginHref(path, search)}`, req.url),
    );
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico).*)",
  ],
};
