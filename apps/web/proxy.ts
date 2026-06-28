import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@repo/i18n";
import { getToken } from "next-auth/jwt";
import { ROUTE, ROUTES } from "./constants";

const intlMiddleware = createMiddleware(routing);

function normalize(pathname: string) {
  const parts = pathname.split("/");
  if (parts[1] === "en" || parts[1] === "uk") {
    return "/" + parts.slice(2).join("/");
  }
  return pathname;
}

export default async function middleware(req: any) {
  const { pathname } = req.nextUrl;

  const path = normalize(pathname);

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: true,
    cookieName: "__Secure-next-auth.session-token",
  });

  const isLoggedIn = !!token;

  const isAuthPage = ROUTES.auth.includes(path);
  const isProtected = ROUTES.protected.includes(path);

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL(ROUTE.DASHBOARD, req.url));
  }

  if (!isLoggedIn && isProtected) {
    return NextResponse.redirect(new URL(ROUTE.LOGIN, req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
