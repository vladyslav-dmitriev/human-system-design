import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, getLocale, headersGet } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  getLocale: vi.fn(),
  headersGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "session=abc" }),
  headers: async () => ({ get: headersGet }),
}));
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale }));

import { serverApiFetch } from "./api-server";

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

describe("serverApiFetch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    redirect.mockClear();
    getLocale.mockResolvedValue("uk");
    headersGet.mockReturnValue("/uk/billing");
    vi.stubGlobal("fetch", fetchMock);
  });

  it("пробрасывает cookie и no-store", async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    await serverApiFetch("http://api/x", { method: "POST" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Cookie).toBe("session=abc");
    expect(init.cache).toBe("no-store");
    expect(init.method).toBe("POST");
  });

  it("добавляет X-Internal-Secret и X-Client-IP (первый адрес x-forwarded-for)", async () => {
    vi.stubEnv("INTERNAL_API_SECRET", "s".repeat(32));
    headersGet.mockImplementation((name: string) =>
      name === "x-forwarded-for" ? "203.0.113.7, 10.0.0.1" : null,
    );
    fetchMock.mockResolvedValue(json(200, {}));
    await serverApiFetch("http://api/x");
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["X-Internal-Secret"]).toBe("s".repeat(32));
    expect(init.headers["X-Client-IP"]).toBe("203.0.113.7");
    vi.unstubAllEnvs();
  });

  it("401 UNAUTHORIZED: редирект на логин локали с callbackUrl", async () => {
    fetchMock.mockResolvedValue(json(401, { code: "UNAUTHORIZED" }));
    await expect(serverApiFetch("http://api/x")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/uk/login?callbackUrl=%2Fbilling&sessionExpired=1",
    );
  });

  it("401 с другим кодом возвращается вызывающему коду", async () => {
    fetchMock.mockResolvedValue(json(401, { code: "AUTH_TICKET_INVALID" }));
    const res = await serverApiFetch("http://api/x");
    expect(res.status).toBe(401);
    expect(redirect).not.toHaveBeenCalled();
  });
});
