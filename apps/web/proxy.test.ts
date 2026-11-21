import { beforeEach, describe, expect, it, vi } from "vitest";

const { getToken, intl } = vi.hoisted(() => ({ getToken: vi.fn(), intl: vi.fn() }));

vi.mock("next-auth/jwt", () => ({ getToken }));
vi.mock("next-intl/middleware", () => ({ default: () => intl }));
// locales/defaultLocale настоящие (их читает normalizePath), routing не нужен
vi.mock("@repo/i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/i18n")>()),
  routing: {},
}));

import { NextRequest, NextResponse } from "next/server";
import middleware from "./proxy";

const ORIGIN = "http://myapp.local";
const req = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, ORIGIN), {
    headers: cookie ? { cookie } : undefined,
  });
const location = (res: Response) => res.headers.get("location");

describe("proxy (middleware)", () => {
  beforeEach(() => {
    getToken.mockReset();
    intl.mockReset();
    intl.mockImplementation(() => NextResponse.next());
  });

  describe("гость на защищённой странице", () => {
    beforeEach(() => getToken.mockResolvedValue(null));

    it("без локали и cookie: редирект на /<дефолтная локаль>/login?callbackUrl=...", async () => {
      const res = await middleware(req("/dashboard"));
      expect(res.status).toBe(307);
      expect(location(res)).toBe(`${ORIGIN}/en/login?callbackUrl=%2Fdashboard`);
      expect(intl).not.toHaveBeenCalled();
    });

    it("локаль из URL сохраняется, callbackUrl без локали", async () => {
      const res = await middleware(req("/uk/settings"));
      expect(location(res)).toBe(`${ORIGIN}/uk/login?callbackUrl=%2Fsettings`);
    });

    it("query-строка попадает в callbackUrl (закодированной)", async () => {
      const res = await middleware(req("/uk/settings?tab=security&x=1"));
      expect(location(res)).toBe(
        `${ORIGIN}/uk/login?callbackUrl=%2Fsettings%3Ftab%3Dsecurity%26x%3D1`,
      );
    });

    it("путь без локали берёт локаль из cookie NEXT_LOCALE", async () => {
      const res = await middleware(req("/billing", "NEXT_LOCALE=uk"));
      expect(location(res)).toBe(`${ORIGIN}/uk/login?callbackUrl=%2Fbilling`);
    });

    it("неизвестная локаль в cookie игнорируется", async () => {
      const res = await middleware(req("/billing", "NEXT_LOCALE=fr"));
      expect(location(res)).toBe(`${ORIGIN}/en/login?callbackUrl=%2Fbilling`);
    });

    it("вложенная защищённая страница /settings/security перенаправляется", async () => {
      const res = await middleware(req("/settings/security"));
      expect(location(res)).toBe(
        `${ORIGIN}/en/login?callbackUrl=%2Fsettings%2Fsecurity`,
      );
    });

    it.each(["/billing", "/pricing", "/checkout", "/thank-you-payment", "/todos"])(
      "%s перенаправляется (единый список маршрутов)",
      async (path) => {
        const res = await middleware(req(path));
        expect(res.status).toBe(307);
        expect(location(res)).toContain("/login?callbackUrl=");
      },
    );

    it("/pricing-x не защищён и проходит в intl", async () => {
      await middleware(req("/en/pricing-x"));
      expect(intl).toHaveBeenCalledTimes(1);
    });

    it("callbackUrl не может увести на чужой хост: значение закодировано", async () => {
      const res = await middleware(req("/uk/settings?next=//evil.example"));
      const target = new URL(location(res)!);
      expect(target.origin).toBe(ORIGIN);
      expect(target.searchParams.get("callbackUrl")).toBe(
        "/settings?next=//evil.example",
      );
    });
  });

  it("авторизованный на странице входа: редирект на /<локаль>/dashboard", async () => {
    getToken.mockResolvedValue({ sub: "1" });
    const expected: Record<string, string> = {
      "/login": `${ORIGIN}/en/dashboard`,
      "/en/login": `${ORIGIN}/en/dashboard`,
      "/uk/create-account": `${ORIGIN}/uk/dashboard`,
    };
    for (const [p, to] of Object.entries(expected)) {
      const res = await middleware(req(p));
      expect(location(res)).toBe(to);
    }
  });

  it("авторизованный на защищённой странице проходит в intl", async () => {
    getToken.mockResolvedValue({ sub: "1" });
    await middleware(req("/en/dashboard"));
    expect(intl).toHaveBeenCalledTimes(1);
  });

  it("гость на странице входа проходит в intl", async () => {
    getToken.mockResolvedValue(null);
    await middleware(req("/en/login"));
    expect(intl).toHaveBeenCalledTimes(1);
  });

  it("getToken вызывается с cookieName из constants (dev: без __Secure-)", async () => {
    getToken.mockResolvedValue(null);
    await middleware(req("/login"));
    expect(getToken.mock.calls[0]![0]).toMatchObject({
      cookieName: "next-auth.session-token",
      secureCookie: false,
    });
  });
});
