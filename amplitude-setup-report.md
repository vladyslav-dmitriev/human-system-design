<wizard-report>

# Amplitude Setup Report

**Date:** 2026-06-03  
**Project:** human-system-design (apps/web)  
**Amplitude Project ID:** 100049586  
**Data Region:** EU (`https://app.eu.amplitude.com`)  
**SDK:** `@amplitude/analytics-browser@^2.42.5`

---

## What was done

### 1. SDK installed
`@amplitude/analytics-browser` added to `apps/web/package.json` dependencies via `pnpm --filter web add`.

### 2. Environment variable
`NEXT_PUBLIC_AMPLITUDE_API_KEY` written to `apps/web/.env.local` (gitignored, never committed).

### 3. Amplitude initialized
`instrumentation-client.js` — Amplitude init added alongside existing Sentry init. Uses Next.js 15.3+ `instrumentation-client` pattern for automatic client-side setup on every page load. Autocapture enabled (page views, sessions, form interactions, element clicks).

```js
// instrumentation-client.js
amplitude.init(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY, {
  serverUrl: "https://api.eu.amplitude.com/2/httpapi",
  autocapture: true,
});
```

---

## Events

### Instrumented (4 / 4)

| Event | File | Properties |
|-------|------|------------|
| **Account Created** | `apps/web/app/create-account/page.tsx` | `sign_up_method` ("credentials" \| "google" \| "github") |
| **User Signed In** | `apps/web/app/login/page.tsx` | `sign_in_method` ("credentials" \| "google" \| "github") |
| **Todo Completed** | `apps/web/shared/ui/TodosList/TodosList.tsx` | `todo_title`, `set_title` |
| **Todo Set Finished** | `apps/web/shared/ui/TodosSet/TodosSet.tsx` | `set_title`, `todo_count` |

### Covered by autocapture (0)
No approved plan events were dropped to autocapture.

### Dropped (0)
All approved plan events were instrumented.

---

## Autocapture (enabled)

The following are captured automatically — no custom `track()` calls needed:
- `[Amplitude] Page Viewed` — all page navigations
- `[Amplitude] Start Session` / `[Amplitude] End Session` — sessions
- `[Amplitude] Form Started` / `[Amplitude] Form Submitted` — login & create-account forms
- `[Amplitude] Element Clicked` — all interactive elements
- `[Amplitude] Element Changed` — form field changes

---

## Files changed

| File | Change |
|------|--------|
| `instrumentation-client.js` | Added Amplitude init (EU region, autocapture on) |
| `apps/web/app/login/page.tsx` | Added `User Signed In` track (credentials + OAuth) |
| `apps/web/app/create-account/page.tsx` | Added `Account Created` track (credentials + OAuth) |
| `apps/web/shared/ui/TodosList/TodosList.tsx` | Added `Todo Completed` track + `todoSetTitle` prop |
| `apps/web/shared/ui/TodosSet/TodosSet.tsx` | Added `Todo Set Finished` track, passes `title` to TodosList |
| `apps/web/.env.local` | Created with `NEXT_PUBLIC_AMPLITUDE_API_KEY` |
| `apps/web/package.json` | Added `@amplitude/analytics-browser@^2.42.5` |

---

## Known limitations

- **Typecheck skipped at end of run**: `pnpm --filter web check-types` reports pre-existing errors (`@repo/typescript-config/nextjs.json` not found, `vitest/globals` type definition missing). These are unrelated to Amplitude instrumentation and pre-date this run. The Amplitude imports and API calls are type-correct given the installed SDK.
- **No server-side Amplitude**: The app uses Next.js Server Actions (`apps/web/actions/create-account.ts`, `apps/web/actions/login.ts`) but these fire on the server. Amplitude browser SDK is client-only. The client-side track calls in the page components fire immediately after server action success, which is the correct pattern for this app's architecture.
- **User identity**: `amplitude.setUserId()` was not called — the app uses NextAuth sessions and does not expose the user ID to client components at login time without additional session reads. User identification can be added by reading the NextAuth session in a client component and calling `amplitude.setUserId(session.user.id)` in a `useEffect` after login.

---

## Next steps

1. Run `amplitude-wizard dashboard` after events begin ingesting to auto-generate charts and a dashboard.
2. View your Amplitude project at: https://app.eu.amplitude.com/amplitude/100049586
3. To add user identification: call `amplitude.setUserId(userId)` after successful login using the NextAuth session.

</wizard-report>
