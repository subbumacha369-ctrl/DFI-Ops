# Production Readiness Audit — Operations OS

**Date:** 2026-06-16 · **Target:** Supabase + Vercel · **Audience:** internal employees (web app)

## Automated gate results (this audit run)
| Check | Command | Result |
| --- | --- | --- |
| Install | `npm install` | ✅ ok |
| TypeScript | `npm run typecheck` | ✅ 0 errors |
| ESLint | `npm run lint` | ✅ 0 warnings / 0 errors |
| Unit tests | `npm test` | ✅ 39 passing (5 files) |
| Production build | `npm run build` | ✅ 34 routes, middleware 90 kB |

The build runs with `NODE_ENV=production`, which (after the fix below) forces **demo mode OFF** — the real authenticated code path that production uses.

## Subsystem verification
| Area | Status | Notes |
| --- | --- | --- |
| Build / TypeScript / ESLint / Tests | ✅ | see table above |
| Environment variables | ✅ documented | `.env.example` complete; `.gitignore` excludes `.env`, `.env.local` (no secrets committed) |
| Security headers | ✅ | `vercel.json`: X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy |
| API protection | ✅ | every route uses `getAuth()` → 401 if unauthenticated; mutations add `callerCan()` permission guards |
| RLS policies | ✅ | enabled on every tenant table; `org_id`/`workspace_id` predicates via `SECURITY DEFINER` helpers; override tables + audit covered (migrations 0010, 0013–0015) |
| Authentication | ✅ | Supabase email/password (+ policy), Google OAuth, password reset, TOTP MFA |
| Session management | ✅ | Supabase SSR cookie sessions; `middleware.ts` refreshes the session and guards private routes on every request |
| Audit trail | ✅ | append-only `audit_events` (UPDATE/DELETE blocked by trigger) records permission/role/visibility changes |

---

## Critical issues / Deployment blockers

1. **[FIXED] Demo mode could bypass authentication in production.**
   `NEXT_PUBLIC_DEMO_MODE=1` enables an in-memory mock and an auth bypass in middleware. If shipped, it would expose all data with no login.
   **Fix applied:** `isDemoMode()` now returns `false` whenever `NODE_ENV === "production"` (all Vercel deployments and `next build`/`next start`). The bypass is now impossible in production regardless of the env flag. Local review (`next dev`) still honors the flag.
   **Operational follow-up:** also set `NEXT_PUBLIC_DEMO_MODE=0` (or omit it) in Vercel.

2. **[ACTION REQUIRED — provisioning] Live Supabase project not yet created/linked.**
   Migrations `0001`→`0015` must be pushed and env vars set before go-live. See `SUPABASE_SETUP.md`. Not a code defect; a deployment step.

3. **[ACTION REQUIRED — provisioning] Production env vars not set in Vercel.**
   The app builds with placeholders; real values are required at deploy. See `VERCEL_DEPLOYMENT.md`.

## High priority issues
- **Regenerate DB types after migration.** `src/types/database.types.ts` is hand-authored to match the migrations. After `supabase db push`, run `npm run db:types` to guarantee schema↔type parity and rebuild.
- **Third-party keys degrade features if absent (non-blocking):** Anthropic (AI extraction falls back to a heuristic), Resend (invitation/notification emails become no-ops), Upstash (rate limiting fails open). Set them for full functionality.
- **Manager column-level edit scope** is enforced in the app layer (which HR fields a manager may change), with row-level scope in RLS. Acceptable for launch; tighten with column policies later.

## Medium priority issues
- **No CI E2E run by default.** Playwright smoke tests exist (`npm run test:e2e`) but need a running server; wire into CI post-launch.
- **Realtime is published but UI polls** (React Query intervals) rather than subscribing — fine for current scale.
- **Scheduled jobs not deployed** (deadline-approaching reminders, report cron). Generation is on-demand today.
- **pgTAP RLS test covers one isolation case** (`supabase/tests/rls_isolation.test.sql`); expand the matrix post-launch.

## Conclusion
No remaining **code** blockers. The single critical code risk (demo auth bypass) is fixed. Remaining blockers are **provisioning steps** (Supabase project + env vars), documented in the companion files. Proceed to Supabase/Vercel setup.
