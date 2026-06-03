// auth.config.ts
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Github from "next-auth/providers/github"
import { ROUTE } from "./constants.ts"

export const authConfig = {
  providers: [
    Google, 
    Github
  ],
  pages: {
    signIn: ROUTE.LOGIN,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname === ROUTE.DASHBOARD
      
      const isOnAuthPage = [ROUTE.HOME, ROUTE.LOGIN, ROUTE.CREATE_ACCOUNT].includes(nextUrl.pathname)

      if (isOnAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL(ROUTE.DASHBOARD, nextUrl))
        }

        return true
      }
 
      if (isOnDashboard) {
        return isLoggedIn;
      }

      return true
    },
  },
} satisfies NextAuthConfig