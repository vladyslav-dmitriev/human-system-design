import { describe, expect, it } from "vitest";
import {
  buildLoginHref,
  getSafeCallbackUrl,
  isAuthRoute,
  isProtectedRoute,
} from "./guards";
import { ROUTES } from "../../constants";

describe("guards", () => {
  it("isAuthRoute: точное совпадение", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/create-account")).toBe(true);
    expect(isAuthRoute("/")).toBe(true);
    expect(isAuthRoute("/dashboard")).toBe(false);
    expect(isAuthRoute("/login/extra")).toBe(false);
  });

  it("isProtectedRoute: защищает вложенные пути", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/settings/security")).toBe(true);
    expect(isProtectedRoute("/login")).toBe(false);
  });

  it("каждый защищённый маршрут из ROUTES защищён", () => {
    for (const r of ROUTES.protected) expect(isProtectedRoute(r)).toBe(true);
  });

  it("/pricing-x не считается защищённым маршрутом (сравнение по сегментам)", () => {
    expect(isProtectedRoute("/pricing-x")).toBe(false);
    expect(isProtectedRoute("/settingsx")).toBe(false);
    expect(isProtectedRoute("/todos2")).toBe(false);
  });

  it("защищены все страницы приложения, включая цены и оплату (гость на /checkout)", () => {
    for (const r of [
      "/pricing",
      "/checkout",
      "/thank-you-payment",
      "/billing",
    ]) {
      expect(isProtectedRoute(r)).toBe(true);
    }
  });

  describe("buildLoginHref", () => {
    it("кодирует путь и query в callbackUrl", () => {
      expect(buildLoginHref("/settings")).toBe(
        "/login?callbackUrl=%2Fsettings",
      );
      expect(buildLoginHref("/settings", "?tab=a&b=1")).toBe(
        "/login?callbackUrl=%2Fsettings%3Ftab%3Da%26b%3D1",
      );
    });
  });

  describe("getSafeCallbackUrl (open redirect)", () => {
    it.each([
      [null, "/dashboard"],
      [undefined, "/dashboard"],
      ["", "/dashboard"],
      ["/settings", "/settings"],
      ["/settings?tab=security", "/settings?tab=security"],
      ["/uk/settings", "/settings"],
      ["https://evil.example", "/dashboard"],
      ["//evil.example", "/dashboard"],
      ["///evil.example", "/dashboard"],
      ["/uk//evil.example", "/dashboard"],
      ["/uk/\\evil.example", "/dashboard"],
      ["/\\evil.example", "/dashboard"],
      ["javascript:alert(1)", "/dashboard"],
      ["evil", "/dashboard"],
      ["/login", "/dashboard"],
      ["/uk/login", "/dashboard"],
      ["/create-account?x=1", "/dashboard"],
      ["/forgot-password", "/dashboard"],
      ["/a\nb", "/dashboard"],
    ])("%j -> %s", (input, expected) => {
      expect(getSafeCallbackUrl(input as string | null | undefined)).toBe(
        expected,
      );
    });

    it("управляющие символы (CR/LF/TAB) отклоняются", () => {
      expect(getSafeCallbackUrl("/ok\r\nSet-Cookie: x=1")).toBe("/dashboard");
      expect(getSafeCallbackUrl("/\t/evil.example")).toBe("/dashboard");
    });
  });
});
