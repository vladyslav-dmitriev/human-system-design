// auth.config.ts
import type { NextAuthConfig } from "next-auth";
import { ROUTE } from "./constants";
import { normalizePath } from "./shared/lib/normalize-path";
import { isAuthRoute, isProtectedRoute } from "./shared/utils/guards";

export const authConfig = {
  // OAuth (Google, GitHub) отключён до реализации привязки к Nest API
  providers: [],
  basePath: "/api/auth",
  pages: {
    signIn: ROUTE.LOGIN,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = normalizePath(nextUrl.pathname);

      if (isAuthRoute(path)) {
        if (isLoggedIn) {
          return Response.redirect(new URL(ROUTE.DASHBOARD, nextUrl));
        }

        return true;
      }

      if (isProtectedRoute(path)) {
        return isLoggedIn;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
