# Security Review — Operations OS

Scope: RLS, API authorization, permission matrix, session expiry, route protection, file access.

## Posture summary
Security is enforced in **three layers**: the database (RLS — the backstop), the API (auth + permission
guards), and the UI (visibility gating). The database layer is authoritative: even if app code forgets a
check, RLS prevents cross-tenant data access.

## Controls verified

### RLS policies
- Enabled on **every** tenant table. Tenancy predicates use `SECURITY DEFINER` helpers
  (`is_org_member`, `is_org_admin`, `is_workspace_member`, `is_workspace_admin`, `is_org_manager`) keyed on
  `org_id`/`workspace_id`, preventing infinite recursion and cross-tenant leakage.
- Override tables (`role_permissions`, `feature_visibility`): members may **read**, only org admins may
  **write** (migration 0015).
- `audit_events` is **append-only** — UPDATE/DELETE blocked by a trigger *and* RLS; admins read, members append.

### API authorization
- Every route handler calls `getAuth()` and returns **401** when unauthenticated.
- Mutations that change org/permission/member state call `callerCan(...)` / `loadAppRole(...)` and return
  **403** without the permission (e.g. `members.manage`, `permissions.manage`, `departments.manage`).
- Role assignment is capped by `assignableRoles()` — a user can never grant a role at or above their own level.
- `super_admin` permissions and visibility are immutable via the API (rejected server-side).

### Permission matrix
- DB-backed `role_permissions` overrides over code defaults (`src/lib/rbac.ts`), enforced consistently in
  frontend (`useAccess().can`), backend (`callerCan`), and surfaced read-only/edit per the caller's rights.

### Session expiry & management
- Supabase SSR **cookie-based** sessions; `middleware.ts` calls `supabase.auth.getUser()` on every request
  to refresh tokens and write rotated cookies. JWT expiry is Supabase-configured (default 1h) with refresh.
- Sign-out clears the session and redirects to `/login`.

### Route protection
- `middleware.ts` redirects unauthenticated users to `/login` for all non-public paths; public paths are an
  explicit allowlist (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/mfa`, `/auth/*`,
  `/accept-invite`). Server pages re-check `getUser()` and redirect.

### File access control
- Private `attachments` Storage bucket; objects are namespaced `{org_id}/{workspace_id}/…` and Storage RLS
  requires **org membership of the path's first segment**. Files are served only via short-lived signed URLs
  (1h) minted server-side; uploads use signed upload URLs.

## Risks / vulnerabilities

| # | Risk | Severity | Status |
| --- | --- | --- | --- |
| 1 | Demo mode bypasses auth and uses mock data | **Critical** | **Fixed** — hard-disabled when `NODE_ENV=production`; also set `NEXT_PUBLIC_DEMO_MODE=0` |
| 2 | Service-role key exposure | High | Mitigated — only used server-side (`lib/supabase/admin.ts`, seed); never `NEXT_PUBLIC_`; `.gitignore` excludes env files |
| 3 | Manager column-level edit scope | Medium | App-enforced (which HR fields a manager edits); row scope in RLS. Acceptable; add column policies later |
| 4 | Rate limiting fails open if Upstash down | Low | Accepted (availability over strictness); set Upstash in prod |
| 5 | RLS regression risk on future schema changes | Medium | pgTAP isolation test exists; expand matrix + add to CI |
| 6 | Email enumeration on password reset | Low | Mitigated — reset always returns a generic success message |

## Fixes applied this sprint
- **Demo auth bypass neutralized in production** (`src/lib/demo/config.ts`): `isDemoMode()` returns `false`
  under `NODE_ENV=production`. Verified: `npm run build` (production) produces the authenticated middleware
  path with no mock client.
- Confirmed `.gitignore` excludes `.env`, `.env.local`, `.vercel` — no secrets in the repo.

## Pre-go-live security checklist
- [ ] `NEXT_PUBLIC_DEMO_MODE=0` (or unset) in Vercel
- [ ] Service role key set as a **non-public** Vercel env var only
- [ ] Supabase Auth redirect URLs locked to the production domain
- [ ] `supabase db push` applied; `get_advisors` (Supabase security linter) reviewed
- [ ] HTTPS enforced (Vercel default) + security headers present (verify via response headers)
- [ ] `supabase test db` (RLS isolation) passes against the project
