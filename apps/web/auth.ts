import NextAuth, { NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import { API_URL } from "./api";

export const result = NextAuth({
  ...authConfig,

  session: {
    strategy: "jwt", // Сессии хранятся в зашифрованной куке, а не в БД
  },
  cookies: {
    sessionToken: {
      // name:
      //   process.env.NODE_ENV === "production"
      //     ? `__Secure-next-auth.session-token`
      //     : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax", // 'lax' достаточно для переходов между страницами
        path: "/",
        // secure: process.env.NODE_ENV === "production", // ВАЖНО: на Vercel всегда true (HTTPS)
        secure: false,
        domain: "myapp.local",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
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
      async authorize(credentials) {
        console.log("authorize", credentials);

        if (!credentials?.email || !credentials?.password) return null;

        try {
          const response = await fetch(API_URL.auth.validate(), {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

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
          };
        } catch (error) {
          console.error(error);
        }
      },
    }),
  ],
});

export const handlers: NextAuthResult["handlers"] = result.handlers;
export const auth: NextAuthResult["auth"] = result.auth;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;
