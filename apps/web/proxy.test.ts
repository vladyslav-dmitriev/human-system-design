import { beforeEach, describe, expect, it, vi } from "vitest";

const { getToken, intl } = vi.hoisted(() => ({ getToken: vi.fn(), intl: vi.fn() }));

vi.mock("next-auth/jwt", () => ({ getToken }));
vi.mock("next-intl/middleware", () => ({ default: () => intl }));
vi.mock("@repo/i18n", () => ({ routing: {} }));

import { NextRequest, NextResponse } from "next/server";
import middleware from "./proxy";

const req = (path: string) => new NextRequest(new URL(path, "http://myapp.local"));
const location = (res: Response) => res.headers.get("location");

describe("proxy (middleware)", () => {
  beforeEach(() => {
    getToken.mockReset();
    intl.mockReset();
    intl.mockImplementation(() => NextResponse.next());
  });

  it("гость на защищённой странице: редирект на /login", async () => {
    getToken.mockResolvedValue(null);
    const res = await middleware(req("/dashboard"));
    expect(res.status).toBe(307);
    expect(location(res)).toBe("http://myapp.local/login");
    expect(intl).not.toHaveBeenCalled();
  });

  it("гость на защищённой странице с локалью: редирект на /login", async () => {
    getToken.mockResolvedValue(null);
    const res = await middleware(req("/uk/settings"));
    expect(location(res)).toBe("http://myapp.local/login");
  });

  it("авторизованный на странице входа: редирект на /dashboard", async () => {
    getToken.mockResolvedValue({ sub: "1" });
    for (const p of ["/login", "/en/login", "/uk/create-account"]) {
      const res = await middleware(req(p));
      expect(location(res)).toBe("http://myapp.local/dashboard");
    }
  });

  it("авторизованный на защищённой странице проходит в intl", async () => {
    getToken.mockResolvedValue({ sub: "1" });
    await middleware(req("/en/dashboard"));
    expect(intl).toHaveBeenCalledTimes(1);
  });

  it("гость на публичной странице проходит в intl", async () => {
    getToken.mockResolvedValue(null);
    await middleware(req("/en/login"));
    expect(intl).toHaveBeenCalledTimes(1);
  });

  it("getToken вызывается с cookieName для dev", async () => {
    getToken.mockResolvedValue(null);
    await middleware(req("/login"));
    expect(getToken.mock.calls[0]![0]).toMatchObject({
      cookieName: "next-auth.session-token",
      secureCookie: false,
    });
  });

  // BUG: см. FIX.md "Защита маршрутов: prefix-match и точное совпадение расходятся"
  // guards.ts защищает вложенные пути, proxy.ts проверяет только точное совпадение
  it.fails("гость на вложенной защищённой странице /settings/security перенаправляется", async () => {
    getToken.mockResolvedValue(null);
    const res = await middleware(req("/settings/security"));
    expect(location(res)).toBe("http://myapp.local/login");
  });

  it("гость на /billing перенаправляется", async () => {
    getToken.mockResolvedValue(null);
    const res = await middleware(req("/billing"));
    expect(location(res)).toBe("http://myapp.local/login");
  });
});
