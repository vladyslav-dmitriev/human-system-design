import type { DefaultSession } from "next-auth";

// Роль приходит из Nest (auth/validate) и прокидывается в JWT и сессию (см. auth.ts)
declare module "next-auth" {
  interface User {
    role?: string;
    /** Версия сессии из api (validate): api сравнивает её с Redis при каждом запросе */
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    /** Лежит на верхнем уровне токена: так её читает AuthGuard api */
    sessionVersion?: number;
  }
}
