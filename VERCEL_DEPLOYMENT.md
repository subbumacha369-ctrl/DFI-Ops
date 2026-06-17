# Vercel Deployment — Operations OS

Step-by-step deployment of the Next.js 15 app to Vercel, backed by a production Supabase project.

## Prerequisites
- A production **Supabase** project provisioned per `SUPABASE_SETUP.md` (migrations pushed, auth configured).
- A Vercel account with access to the Git repository.
- The project root is **`ops-os/`** (set this as the Vercel "Root Directory" if the repo contains more).

## Build configuration (already in repo)
- `vercel.json`: framework `nextjs`, build `next build`, region `bom1` (change if needed), security headers.
- `next.config.ts`: typed routes, image `remotePatterns` for `*.supabase.co` and `lh3.googleusercontent.com`.
- Middleware (`src/middleware.ts`) runs on all non-static routes for session refresh + auth guard.
- Node 20+ (Vercel default is fine).

## Step 1 — Import the project
1. Vercel → **Add New → Project** → import the Git repo.
2. **Framework Preset:** Next.js (auto-detected).
3. **Root Directory:** `ops-os` (if the repo root isn't already the app).
4. Build Command `next build` and Output are auto-configured.

## Step 2 — Environment variables
Project → **Settings → Environment Variables** (set for **Production**; repeat for Preview if used):

| Variable | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key | **not** `NEXT_PUBLIC`; server-only |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` | OAuth/email redirects |
| `NEXT_PUBLIC_DEMO_MODE` | `0` | must be 0/unset (also hard-off in prod builds) |
| `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL_FAST`/`SMART`) | optional | AI features |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | optional | rate limiting |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional | transactional email |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google sign-in |

## Step 3 — First deploy
1. Click **Deploy**. Vercel runs `next build` (`NODE_ENV=production` → demo mode hard-off).
2. Confirm the build log shows ~34 routes and `ƒ Middleware`.

## Step 4 — Domain & redirects
1. **Settings → Domains:** add your custom domain; Vercel provisions **SSL** automatically.
2. Set `NEXT_PUBLIC_SITE_URL` to the final domain and **redeploy** (so OAuth/email links resolve).
3. In **Supabase → Auth → URL Configuration**, set Site URL + redirect URLs to the production domain.
4. In **Google Cloud Console**, ensure the OAuth redirect `https://<ref>.supabase.co/auth/v1/callback` is allowed.

## Step 5 — Routing / middleware verification (post-deploy)
- `GET /` → 307 → `/login` when logged out; → `/<org>/dashboard` when a member.
- Unauthenticated `/<org>/dashboard` → 307 → `/login?redirect=…`.
- `/auth/callback` and `/auth/confirm` complete OAuth/email flows.
- Response headers include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` (from `vercel.json`).

## Step 6 — Smoke test in production
Sign up the first admin → create org → invite a teammate → create a project + tasks → open the dashboard
(filters + drill-downs) → open `/permissions` and toggle a cell → confirm it appears in `/audit`.

## Build output (reference, from local production build)
- 34 routes (static `○` auth pages; dynamic `ƒ` app + API routes); shared JS ~102 kB; Middleware ~90 kB.

## Rollback
Vercel keeps immutable deployments — **Deployments → … → Promote to Production** on a previous good build to
roll back instantly. For DB changes, restore the Supabase snapshot taken before `db push`.

## CI (optional, recommended)
A GitHub Actions workflow (`.github/workflows/ci.yml`) runs typecheck/lint/test/build on push; gate Vercel
production promotion on it.
