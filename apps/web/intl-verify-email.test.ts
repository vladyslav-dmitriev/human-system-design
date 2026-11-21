import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@repo/i18n";

import { isAuthRoute, isProtectedRoute } from "./shared/utils/guards";

// Письмо ведёт на /verify-email?token=... без локали: проверяем настоящий next-intl middleware
describe("/verify-email из письма", () => {
  it("без локали редиректится на локализованный путь с сохранением query", () => {
    const res = createMiddleware(routing)(
      new NextRequest("http://myapp.local/verify-email?token=a.b-c"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://myapp.local/en/verify-email?token=a.b-c",
    );
  });

  it("страница публичная: не защищённая и не auth-маршрут", () => {
    expect(isProtectedRoute("/verify-email")).toBe(false);
    expect(isAuthRoute("/verify-email")).toBe(false);
  });
});
