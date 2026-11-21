import { test, expect } from "../fixtures";
import { SettingsPage } from "../pages/settings-page";

// SMS and the 2FA endpoints are always mocked: no real SMS, no Twilio.
test.beforeEach(async ({ page, freshUser }) => {
  void freshUser;
  await page.route("**/sender/sms/send", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: "{}" }),
  );
});

async function openPhoneStep(page: import("@playwright/test").Page) {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  const phone = page.getByPlaceholder("+380 (XX) XXX XX XX");
  // The page is server-rendered: a click before hydration is lost, so retry the click.
  await expect(async () => {
    await page.getByRole("switch").click();
    await expect(phone).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  return phone;
}

test("2FA: enabling the switch shows the phone form", async ({ page }) => {
  const phone = await openPhoneStep(page);

  await expect(phone).toBeVisible();
  await expect(
    page.getByRole("button", { name: /send code|надіслати/i }),
  ).toBeVisible();
});

test("2FA: empty phone does not request an SMS", async ({ page }) => {
  const phone = await openPhoneStep(page);
  let smsRequested = false;
  await page.route("**/sender/sms/send", (route) => {
    smsRequested = true;
    return route.fulfill({ status: 201, body: "{}" });
  });
  await expect(phone).toBeVisible();

  await page.getByRole("button", { name: /send code|надіслати/i }).click();

  await expect(phone).toBeVisible();
  expect(smsRequested).toBe(false);
});

test("2FA: valid phone moves to the code form with 6 digit slots", async ({
  page,
}) => {
  const phone = await openPhoneStep(page);
  await phone.fill("+380501234567");

  await page.getByRole("button", { name: /send code|надіслати/i }).click();

  await expect(page.getByText("+380501234567")).toBeVisible();
  const otp = page.getByRole("textbox").last();
  await otp.fill("1234567");
  await expect(otp).toHaveValue("123456");
});

test("2FA: correct code enables two-factor", async ({ page }) => {
  const phone = await openPhoneStep(page);
  await phone.fill("+380501234567");
  await page.getByRole("button", { name: /send code|надіслати/i }).click();
  await page.route("**/user/profile/2fa", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: "{}" }),
  );

  await expect(page.getByText(/\+380501234567/)).toBeVisible();
  await page.getByRole("textbox").last().fill("123456");
  const request = page.waitForRequest("**/user/profile/2fa");
  await page.getByRole("button", { name: /confirm|підтвердити/i }).click();

  expect((await request).postDataJSON()).toMatchObject({
    phone: "+380501234567",
    code: "123456",
    twoFactorEnabled: true,
  });
  await expect(page.getByText("+380501234567")).toBeVisible();
});

// BUG: см. FIX.md "2FA: неверный код считается успешным" [L3]
// handleEnterCode ignores the response status and shows 2FA as enabled.
test.fixme("2FA: rejected code does not enable two-factor", async ({
  page,
}) => {
  const phone = await openPhoneStep(page);
  await phone.fill("+380501234567");
  await page.getByRole("button", { name: /send code|надіслати/i }).click();
  await page.route("**/user/profile/2fa", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Invalid code" }),
    }),
  );

  await expect(page.getByText(/\+380501234567/)).toBeVisible();
  await page.getByRole("textbox").last().fill("000000");
  await page.getByRole("button", { name: /confirm|підтвердити/i }).click();

  await expect(page.getByText(/enabled|увімкнено/i)).toHaveCount(0);
});
