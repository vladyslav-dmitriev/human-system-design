import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";

const { signOut, replace, refresh } = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signOut }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { Logout } from "./logout";

const fetchMock = vi.fn();

describe("Logout", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    signOut.mockReset();
    replace.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("вызывает POST /service-auth/logout до signOut", async () => {
    const order: string[] = [];
    fetchMock.mockImplementation(async () => {
      order.push("api");
      return new Response("{}");
    });
    signOut.mockImplementation(async () => {
      order.push("signOut");
    });

    const { getByRole } = render(<Logout />);
    fireEvent.click(getByRole("button"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(order).toEqual(["api", "signOut"]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/service-auth\/logout$/);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
  });

  it("ошибка api не мешает локальному выходу", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("offline"));

    const { getByRole } = render(<Logout />);
    fireEvent.click(getByRole("button"));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
