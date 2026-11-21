---
name: e2e-env-constraints
description: Constraints of the shared docker stack that make Playwright e2e flaky unless handled (throttling, reCAPTCHA, dev-mode web, no tests for pnpm shell tricks)
metadata:
  type: project
---

- API throttles every route to 10 req/min per IP (`ThrottlerModule` in `apps/api/src/modules/app.module.ts`); `service-auth/login` and `verify-otp` 3/min. The web container renders SSR pages from one IP, so settings/billing/pricing can show "Не вдалося завантажити профіль користувача." (429). e2e helpers (`gotoAndWait`, `loginAndGetStatus`, fixtures registration) retry via `expect(...).toPass`.
- reCAPTCHA v3 is real (no test mode); forms hang silently until `window.grecaptcha` is loaded, so wait for it (`waitForPageReady`) before submitting.
- Target is `next dev` (cold compiles ~9s), `ERR_NETWORK_CHANGED` blips appear; use generous timeouts.
- Never `pkill -f playwright` (kills other agents' browsers) and never `pgrep -f "playwright test"` inside a wait loop (matches itself); kill own PIDs.
- Shell hook blocks commands mentioning `.env` files; write them with the Write tool.
- Env for runs: E2E_USER_EMAIL / E2E_USER_PASSWORD, kept in the session scratchpad, never in reports.

**Why:** discovered during L3 e2e run 2026-11-20. **How to apply:** before writing new e2e specs, reuse the helpers in `packages/e2e/pages/helpers.ts` and `fixtures.ts`.
