---
name: api-e2e-harness
description: How apps/api/test e2e works, and env quirks (tsx dev stack skips DTO validation, captcha blocks black-box auth, 5s connect delay)
metadata:
  type: project
---

apps/api/test/*.e2e-spec.ts: Nest testing module + supertest with real AuthGuard (cookie made via `@auth/core/jwt` encode with a test AUTH_SECRET, helper `test/helpers/app.ts`), fake Stripe injected into real StripeProvider, in-memory repos. `test/blackbox.e2e-spec.ts` runs only with `API_E2E_URL=http://myapp.local/api`. jest-e2e.json needs transformIgnorePatterns for ESM deps (@auth/core, uuid, jose) and tsx in moduleFileExtensions.

**Why:** docker-compose runs api via `tsx watch` (esbuild, no design:paramtypes), so ValidationPipe silently does not validate DTOs on the live dev stack; compiled (tsc/dist, prod image) does. Black-box DTO-400 checks therefore pass only in Nest testing module.
**How to apply:** do not trust live dev stack for validation behaviour; captcha (Google reCAPTCHA) blocks register/login black-box, so authenticated flows are tested via the testing module. `myapp.local` connect takes ~5s per request (IPv6 fallback), black-box suite takes ~3.5 min. Global throttler is 10 req/min per route per IP; keep live calls few.
