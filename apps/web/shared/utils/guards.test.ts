import { describe, expect, it } from "vitest";
import { isAuthRoute, isProtectedRoute } from "./guards";
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

  // BUG: см. FIX.md "isProtectedRoute: startsWith даёт ложные срабатывания"
  it.fails("/pricing-x не считается защищённым маршрутом", () => {
    expect(isProtectedRoute("/pricing-x")).toBe(false);
  });
});
