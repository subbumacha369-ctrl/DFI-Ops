# Supabase Production Setup — Operations OS

How to provision a real Supabase project so authentication, organizations, workspaces, RBAC,
the permission matrix, user management, projects, tasks, and notifications all work in production.

## Required services
| Service | Used for | Setup |
| --- | --- | --- |
| **PostgreSQL** | All application data (42+ tables) | Created automatically with the project; schema via migrations |
| **Authentication** | Email/password, Google OAuth, password reset, TOTP MFA | Enable providers in Auth settings |
| **Storage** | Task/document attachments (private `attachments` bucket) | Created by migration `0012` |
| **Realtime** | Live task/comment/notification updates | Publication configured by migrations `0012`/`0013` |
| Extensions | `pgcrypto`, `vector` (pgvector for knowledge), `pg_trgm` (search) | Created by migration `0001` |

## Required environment variables
Set these in Vercel (and `.env.local` for local against the real project):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-only; seeding/admin. NEVER expose to the browser.
NEXT_PUBLIC_SITE_URL=https://<your-domain>      # OAuth/email redirect base
NEXT_PUBLIC_DEMO_MODE=0                          # MUST be 0/unset in production (also hard-off in prod builds)
```
Optional (features degrade gracefully without them):
```
ANTHROPIC_API_KEY=...           ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001   ANTHROPIC_MODEL_SMART=claude-sonnet-4-6
UPSTASH_REDIS_REST_URL=...      UPSTASH_REDIS_REST_TOKEN=...
RESEND_API_KEY=...             EMAIL_FROM="Operations OS <noreply@yourdomain.com>"
GOOGLE_CLIENT_ID=...           GOOGLE_CLIENT_SECRET=...   # required only for Google sign-in
```
Get URL + keys from **Supabase → Project Settings → API**.

## Migration commands
From the repo root (`ops-os/`):
```bash
supabase login                         # opens browser; paste access token
supabase link --project-ref <project-ref>
supabase db push                       # applies migrations 0001 → 0015 (schema, RLS, storage, realtime, RBAC)
npm run db:types                       # regenerate src/types/database.types.ts from the live schema
```
`supabase db push` creates: tenancy (orgs/members/invitations/departments/teams), workspaces, the full
work model (projects, milestones, task_statuses, tasks, dependencies, comments, mentions, attachments,
templates), AI pipeline, knowledge base (+pgvector), automation, notifications, activity, audit, **RLS on
every table**, and the Sprint-1/2 additions (employee HR fields, `app_role`, `role_permissions`,
`feature_visibility`).

## Auth configuration (Supabase dashboard)
1. **Authentication → URL Configuration**: set **Site URL** to your domain; add Redirect URLs:
   `https://<domain>/auth/callback` and `https://<domain>/auth/confirm`.
2. **Authentication → Providers**: enable **Email**; enable **Google** and paste `GOOGLE_CLIENT_ID/SECRET`
   (Google console redirect: `https://<project-ref>.supabase.co/auth/v1/callback`).
3. **MFA**: TOTP is enabled in `supabase/config.toml`; confirm it's on in the dashboard.

## Seed commands (optional — demo org + two users)
Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment:
```bash
npm run seed
```
Creates `owner@demo.test` / `member@demo.test` (password `Str0ngPass`), a demo org, a workspace, and the
default task workflow. **Skip in a clean production tenant** unless you want sample data.

## Per-feature verification (after push + first admin signs up)
| Feature | How to verify |
| --- | --- |
| Authentication | Sign up, confirm email, log in; enroll MFA |
| Organizations | Create an org (atomic RPC seeds owner + default workspace + statuses) |
| Workspaces | Create a workspace; default statuses appear |
| RBAC / Permission Matrix | Open `/<org>/permissions`; toggle a cell; confirm it persists + appears in Audit log |
| User Management | Invite a member (email arrives if Resend set), set role/department/reporting officer |
| Projects | Create a project, add milestones + team, link tasks |
| Tasks | Create/assign/move tasks (List/Kanban/Calendar); comments + mentions notify |
| Notifications | Assign a task to another user → in-app bell + email (if Resend set) |

## Rollback
`supabase db reset` (destructive, local/staging only). For production, take a snapshot/PITR before
`db push`; revert by restoring the snapshot.
