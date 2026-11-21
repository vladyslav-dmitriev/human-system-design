import NextAuth, { NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import { API_URL } from "./api";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "./constants";
import { buildInternalHeaders } from "./shared/lib/internal-headers";

export const result = NextAuth({
  ...authConfig,

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Без AUTH_COOKIE_DOMAIN cookie host-only: работает на localhost
        ...(process.env.AUTH_COOKIE_DOMAIN
          ? { domain: process.env.AUTH_COOKIE_DOMAIN }
          : {}),
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion ?? 0;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  providers: [
    ...authConfig.providers,

    Credentials({
      // Принимает только одноразовый loginTicket из login / verify-otp:
      // пароль и OTP проверяет API до выдачи билета
      async authorize(credentials, request) {
        const loginTicket = credentials?.loginTicket;

        if (typeof loginTicket !== "string" || !loginTicket) return null;

        try {
          const response = await fetch(API_URL.auth.validate(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...buildInternalHeaders(request?.headers),
            },
            body: JSON.stringify({ loginTicket }),
          });

          if (!response.ok) return null;

          const data = await response.json();

          const user = data.user;

          if (!user) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            sessionVersion:
              typeof user.sessionVersion === "number" ? user.sessionVersion : 0,
          };
        } catch (error) {
          console.error(error);
          return null;
        }
      },
    }),
  ],
});

export const handlers: NextAuthResult["handlers"] = result.handlers;
export const auth: NextAuthResult["auth"] = result.auth;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;
