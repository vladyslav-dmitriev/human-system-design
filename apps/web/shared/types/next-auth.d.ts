import type { DefaultSession } from "next-auth";

// Роль приходит из Nest (auth/validate) и прокидывается в JWT и сессию (см. auth.ts)
declare module "next-auth" {
  interface User {
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }
}
