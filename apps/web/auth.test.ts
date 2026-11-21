import { describe, expect, it, vi } from "vitest";

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
