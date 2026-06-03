"use client";

import { SessionProvider } from "next-auth/react";

import { GBProvider } from "./growth-book-provider";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <GBProvider>{children}</GBProvider>
    </SessionProvider>
  );
}
