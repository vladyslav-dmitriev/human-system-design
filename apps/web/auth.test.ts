import { afterEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ config: undefined as any }));

vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    captured.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (opts: unknown) => opts,
}));

import "./auth";

describe("auth.ts: jwt callback", () => {
  it("при входе кладёт sessionVersion на верхний уровень токена", async () => {
    const token = await captured.config.callbacks.jwt({
      token: {},
      user: { id: "1", role: "USER", sessionVersion: 3 },
    });
    expect(token).toMatchObject({ id: "1", role: "USER", sessionVersion: 3 });
  });

  it("нет sessionVersion у пользователя: 0", async () => {
    const token = await captured.config.callbacks.jwt({
      token: {},
      user: { id: "1" },
    });
    expect(token.sessionVersion).toBe(0);
  });

  it("при обновлении без user токен не меняется", async () => {
    const token = await captured.config.callbacks.jwt({
      token: { sessionVersion: 5 },
    });
    expect(token.sessionVersion).toBe(5);
  });

  it("cookie без domain, если AUTH_COOKIE_DOMAIN не задан", () => {
    expect(captured.config.cookies.sessionToken.options.domain).toBeUndefined();
  });
});

describe("auth.ts: authorize", () => {
  const provider = () =>
    captured.config.providers.find((p: any) => p.authorize);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maxAge сессии 7 дней", () => {
    expect(captured.config.session.maxAge).toBe(7 * 24 * 60 * 60);
  });

  it("шлёт на validate X-Internal-Secret и X-Client-IP", async () => {
    vi.stubEnv("INTERNAL_API_SECRET", "s".repeat(32));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "1", role: "USER" } })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = await provider().authorize(
      { loginTicket: "t" },
      new Request("http://web/x", {
        headers: { "x-forwarded-for": "198.51.100.4, 10.0.0.2" },
      }),
    );

    expect(user).toMatchObject({ id: "1" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["X-Internal-Secret"]).toBe("s".repeat(32));
    expect(init.headers["X-Client-IP"]).toBe("198.51.100.4");
  });

  it("без loginTicket не ходит в api", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await provider().authorize({}, new Request("http://web/x"))).toBe(
      null,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
