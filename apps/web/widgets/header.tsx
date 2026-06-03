"use client";

import { AuthButtons } from "../features/auth-buttons";

export function Header() {
  return (
    <header className="flex items-center justify-end p-2">
      <AuthButtons />
    </header>
  );
}
