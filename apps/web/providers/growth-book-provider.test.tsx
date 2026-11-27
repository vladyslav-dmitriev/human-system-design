import { afterEach, describe, expect, it, vi } from "vitest";

const { init, GrowthBook } = vi.hoisted(() => {
  const init = vi.fn();
  class GrowthBook {
    init = init;
    setAttributes = vi.fn();
  }
  return { init, GrowthBook };
});

vi.mock("@growthbook/growthbook-react", () => ({
  GrowthBook,
  GrowthBookProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }));

const KEY = "NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY";

describe("GBProvider: инициализация GrowthBook", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    init.mockReset();
  });

  it("без клиентского ключа init не вызывается", async () => {
    vi.stubEnv(KEY, "");
    await import("./growth-book-provider");
    expect(init).not.toHaveBeenCalled();
  });

  it("с ключом init вызывается в режиме streaming", async () => {
    vi.stubEnv(KEY, "sdk-test");
    init.mockResolvedValue({});
    await import("./growth-book-provider");
    expect(init).toHaveBeenCalledWith({ streaming: true });
  });

  it("ошибка init не превращается в unhandledRejection", async () => {
    vi.stubEnv(KEY, "sdk-test");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    init.mockRejectedValue(new Error("network"));
    await import("./growth-book-provider");
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith(
      "GrowthBook init failed",
      expect.any(Error),
    );
  });
});
