// auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Github from "next-auth/providers/github";
import { ROUTE } from "./constants";

export const authConfig = {
  providers: [Google, Github],
  basePath: "/api/auth",
  pages: {
    signIn: ROUTE.LOGIN,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      console.log("authorized 777");

      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = [ROUTE.DASHBOARD, ROUTE.TODOS].includes(
        nextUrl.pathname,
      );

      const isOnAuthPage = [
        ROUTE.HOME,
        ROUTE.LOGIN,
        ROUTE.CREATE_ACCOUNT,
      ].includes(nextUrl.pathname);

      if (isOnAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL(ROUTE.DASHBOARD, nextUrl));
        }

        return true;
      }

      if (isProtectedRoute) {
        return isLoggedIn;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
