import { describe, expect, it } from "vitest";
import { authConfig } from "./auth.config";

type Args = Parameters<NonNullable<typeof authConfig.callbacks.authorized>>[0];

const run = (path: string, loggedIn: boolean) =>
  authConfig.callbacks.authorized({
    auth: loggedIn ? { user: { id: "1" } } : null,
    request: { nextUrl: new URL(path, "http://myapp.local") },
  } as unknown as Args);

describe("authConfig.callbacks.authorized", () => {
  it("гость на защищённой странице: false (редирект на signIn)", () => {
    expect(run("/dashboard", false)).toBe(false);
    expect(run("/todos", false)).toBe(false);
  });
  it("авторизованный на защищённой странице: true", () => {
    expect(run("/dashboard", true)).toBe(true);
  });
  it("гость на странице входа: true", () => {
    expect(run("/login", false)).toBe(true);
  });
  it("авторизованный на странице входа: редирект на /dashboard", () => {
    const res = run("/login", true) as Response;
    expect(res.headers.get("location")).toBe("http://myapp.local/dashboard");
  });
  it("публичная страница: true", () => {
    expect(run("/pricing-info", false)).toBe(true);
  });
  it("signIn page = /login", () => {
    expect(authConfig.pages.signIn).toBe("/login");
  });

  // BUG: см. FIX.md "Защита маршрутов: списки расходятся"
  // proxy.ts защищает ещё /settings, /billing, /pricing; здесь их нет
  it.fails("гость на /settings не авторизован", () => {
    expect(run("/settings", false)).toBe(false);
  });
});
