import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));

vi.mock("@/auth", () => ({ auth }));
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => (name === "x-real-ip" ? "198.51.100.9" : null),
  }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (k: string) => k,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import VerifyEmailPage from "./page";

const fetchMock = vi.fn();
const res = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

const renderPage = async (token?: string) =>
  render(await VerifyEmailPage({ searchParams: Promise.resolve({ token }) }));

describe("verify-email page", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    auth.mockReset().mockResolvedValue(null);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_API_SERVER_URL", "http://api.test");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("успех: GET api с token, сообщение и ссылка на логин для гостя", async () => {
    fetchMock.mockResolvedValue(res(200, { success: true }));
    await renderPage("a.b");
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "http://api.test/sender/emails/verify-email?token=a.b",
    );
    const init = fetchMock.mock.calls[0]![1];
    expect(init.headers["X-Client-IP"]).toBe("198.51.100.9");
    expect(screen.getByRole("status")).toHaveTextContent(
      "verify_email_success",
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/login");
  });

  it("с сессией ссылка ведёт в кабинет", async () => {
    auth.mockResolvedValue({ user: { id: "1" } });
    fetchMock.mockResolvedValue(res(200, { success: true }));
    await renderPage("t");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard");
  });

  it("EMAIL_TOKEN_INVALID: сообщение о недействительной ссылке", async () => {
    fetchMock.mockResolvedValue(res(400, { code: "EMAIL_TOKEN_INVALID" }));
    await renderPage("bad");
    expect(screen.getByRole("alert")).toHaveTextContent("verify_email_invalid");
  });

  it("без token: запрос не отправляется, invalid", async () => {
    await renderPage(undefined);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("verify_email_invalid");
  });

  it.each([
    ["500", () => res(500, { code: "INTERNAL" })],
    ["429", () => res(429)],
  ])("прочая ошибка API (%s): общее сообщение", async (_n, make) => {
    fetchMock.mockResolvedValue(make());
    await renderPage("t");
    expect(screen.getByRole("alert")).toHaveTextContent("verify_email_error");
  });

  it("сетевая ошибка: общее сообщение, без исключения", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    await renderPage("t");
    expect(screen.getByRole("alert")).toHaveTextContent("verify_email_error");
  });
});
