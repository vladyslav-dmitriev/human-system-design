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

  it("гость на /settings, /billing, /pricing, /checkout не авторизован (список общий с proxy)", () => {
    for (const p of ["/settings", "/billing", "/pricing", "/checkout"]) {
      expect(run(p, false)).toBe(false);
    }
  });
  it("гость на вложенной защищённой странице не авторизован", () => {
    expect(run("/settings/security", false)).toBe(false);
  });
  it("локаль в пути не мешает защите: /uk/settings", () => {
    expect(run("/uk/settings", false)).toBe(false);
    expect(run("/uk/settings", true)).toBe(true);
  });
  it("OAuth-провайдеры отключены до реализации", () => {
    expect(authConfig.providers).toEqual([]);
  });
});
