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

  console.log("req", req);

  const path = normalize(pathname);

  const allCookies = req.cookies.toString();
  console.log("ВСЕ КУКИ В МИДЛВАРЕ:", allCookies);

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: false,
    cookieName: "next-auth.session-token",
    // secureCookie: process.env.NODE_ENV === "production",
    // cookieName:
    //   process.env.NODE_ENV === "production"
    //     ? "__Secure-next-auth.session-token"
    //     : "next-auth.session-token",
  });

  console.log("token", token);

  const isLoggedIn = !!token;

  console.log("Is Logged In:", isLoggedIn); // ЭТО САМОЕ ВАЖНОЕ

  const isAuthPage = ROUTES.auth.includes(path);
  const isProtected = ROUTES.protected.includes(path);

  if (isLoggedIn && isAuthPage) {
    console.log("!!! REDIRECTING TO LOGIN !!!");
    return NextResponse.redirect(new URL(ROUTE.DASHBOARD, req.url));
  }

  if (!isLoggedIn && isProtected) {
    return NextResponse.redirect(new URL(ROUTE.LOGIN, req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  // matcher: ["/((?!api|_next|.*\\..*).*)"],
  // matcher: [
  //   "/((?!api|_next|.*\\..*|en/login|uk/login|en/create-account|uk/create-account).*)",
  // ],
  // matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
  matcher: [
    "/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico).*)",
  ],
};
