import { Page, Locator, expect } from "@playwright/test";

/**
 * The auth forms are uncontrolled and submit through client JS. Until React is
 * hydrated and the reCAPTCHA script (loaded in a useEffect of the provider) is
 * present, a submit either does a native form GET or rejects the captcha
 * promise and silently hangs. Waiting for grecaptcha means hydration is done.
 */
export async function waitForPageReady(page: Page) {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { grecaptcha?: { execute?: unknown } })
        .grecaptcha?.execute === "function",
  );
}

/**
 * Opens a server-rendered page and waits for `ready`.
 * The API throttles every route to 10 requests/min per IP and the web server calls it
 * from a single IP while rendering, so a page can come back with
 * "Не вдалося завантажити профіль користувача." (429 behind the scenes). Reload until the
 * window frees up instead of failing on infrastructure limits (see report: global throttle).
 */
export async function gotoAndWait(page: Page, url: string, ready: Locator) {
  await expect(async () => {
    await page.goto(url);
    await expect(ready).toBeVisible({ timeout: 10_000 });
  }).toPass({ intervals: [15_000, 30_000, 60_000], timeout: 200_000 });
}
