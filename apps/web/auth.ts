// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { prisma } from "./shared/lib/prisma"
import bcrypt from "bcrypt"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    ...authConfig.providers,
    
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      }
    })
  ],
})