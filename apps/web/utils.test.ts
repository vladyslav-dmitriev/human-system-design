import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "session=abc" }),
}));

import {
  getBillingProducts,
  getPaymentMethods,
  getUserBilling,
  getUserData,
  syncBillingProducts,
} from "./utils";

const fetchMock = vi.fn();
const ok = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const notOk = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) });

describe("SSR-запросы (utils.ts)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubEnv("NEXT_PUBLIC_API_SERVER_URL", "http://server.test/api");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("getUserData: пробрасывает cookie, no-store, ходит на серверный URL", async () => {
    fetchMock.mockReturnValue(ok({ id: "1" }));
    await expect(getUserData()).resolves.toEqual({ id: "1" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://server.test/api/user/profile");
    expect(init.headers.Cookie).toBe("session=abc");
    expect(init.cache).toBe("no-store");
  });

  it.each([
    ["getUserData", getUserData, null],
    ["getUserBilling", getUserBilling, null],
    ["getPaymentMethods", getPaymentMethods, []],
    ["getBillingProducts", getBillingProducts, { recurring: [], oneTime: [] }],
  ] as const)("%s: не ok -> безопасное значение по умолчанию", async (_n, fn, fallback) => {
    fetchMock.mockReturnValue(notOk());
    await expect(fn()).resolves.toEqual(fallback);
  });

  it.each([
    ["getUserData", getUserData, null],
    ["getUserBilling", getUserBilling, null],
    ["getPaymentMethods", getPaymentMethods, []],
    ["getBillingProducts", getBillingProducts, { recurring: [], oneTime: [] }],
  ] as const)("%s: сетевая ошибка не пробрасывается", async (_n, fn, fallback) => {
    fetchMock.mockRejectedValue(new Error("down"));
    await expect(fn()).resolves.toEqual(fallback);
  });

  it("syncBillingProducts: не ok -> []", async () => {
    fetchMock.mockReturnValue(notOk());
    await expect(syncBillingProducts()).resolves.toEqual([]);
  });

  // BUG: см. FIX.md "syncBillingProducts возвращает undefined при ошибке сети"
  it.fails("syncBillingProducts: сетевая ошибка даёт [] (как при не ok)", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    await expect(syncBillingProducts()).resolves.toEqual([]);
  });
});
