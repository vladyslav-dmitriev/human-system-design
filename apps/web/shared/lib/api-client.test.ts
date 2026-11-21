import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("next-auth/react", () => ({ signOut }));

import { apiFetch } from "./api-client";

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

const assign = vi.fn();

const setLocation = (pathname: string, search = "") =>
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { pathname, search, assign },
  });

describe("apiFetch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    signOut.mockReset().mockResolvedValue(undefined);
    assign.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("не трогает успешные ответы", async () => {
    setLocation("/uk/settings");
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    const res = await apiFetch("http://api/x", { method: "GET" });
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("http://api/x", { method: "GET" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("401 с другим кодом (неверный пароль) не разлогинивает", async () => {
    setLocation("/uk/settings");
    fetchMock.mockResolvedValue(
      json(401, { code: "AUTH_INVALID_CREDENTIALS" }),
    );
    await apiFetch("http://api/x");
    expect(signOut).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("401 UNAUTHORIZED: signOut и редирект на логин той же локали с callbackUrl", async () => {
    setLocation("/uk/billing", "?tab=cards");
    fetchMock.mockResolvedValue(json(401, { code: "UNAUTHORIZED" }));
    const res = await apiFetch("http://api/x");
    expect(res.status).toBe(401);
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(
      "/uk/login?callbackUrl=%2Fbilling%3Ftab%3Dcards&sessionExpired=1",
    );
  });
});
