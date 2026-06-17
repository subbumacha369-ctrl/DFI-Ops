# Operations OS

AI-native operations management. Every activity — meetings, notes, messages, docs —
becomes actionable work through one pipeline: **Capture → Extract → Confirm → Track**.

This repository contains **Phase 1**: authentication, organization management,
workspace management, the full database schema, and row-level security.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, React Query, Zustand
- **Backend:** Supabase (Postgres, Auth, RLS, Realtime, Storage)
- **AI (later phases):** Anthropic Claude, pgvector RAG
- **Infra:** Vercel, Upstash Redis

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- An Upstash Redis instance (optional locally — rate limiting fails open)

## Setup

```bash
npm install
cp .env.example .env.local        # fill in the values

# Start the local Supabase stack (Postgres, Auth, Storage, Studio)
supabase start

# Apply all migrations
supabase db reset

# Generate typed database definitions (replaces the hand-authored subset)
npm run db:types

# Optional: seed a demo org with two users
npm run seed
```

Then run the app:

```bash
npm run dev      # http://localhost:3000
```

## Environment variables

See `.env.example`. The essentials for Phase 1:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server Supabase access (RLS-bound) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin ops + seeding (bypasses RLS) |
| `NEXT_PUBLIC_SITE_URL` | OAuth/email redirect base |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Auth + write rate limiting |
| `RESEND_API_KEY` / `EMAIL_FROM` | Invitation emails (best-effort) |

Google sign-in additionally needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
(referenced by `supabase/config.toml`).

## Database

12 ordered migrations in `supabase/migrations/` build the complete schema:
tenancy, workspaces, RLS helper functions, the full work-management model
(tasks with the Created→Accepted→In Progress→Completed→Verified→Closed workflow,
subtasks, dependencies, comments, mentions, attachments, templates, recurrence),
the AI capture pipeline, knowledge base (pgvector), automation, notifications,
reporting, an append-only audit log, RLS policies on every table, bootstrap
functions, and storage/realtime wiring.

Multi-tenancy is enforced **in the database**: every tenant row carries `org_id`,
and RLS policies built on `SECURITY DEFINER` helper functions (`is_org_member`,
`is_org_admin`, `is_workspace_member`, `is_workspace_admin`) guarantee a forgotten
filter in app code cannot leak data across tenants.

## Testing

```bash
npm test          # unit tests (Vitest) — validations, utils
npm run test:e2e  # Playwright smoke tests — auth flow
supabase test db  # pgTAP RLS isolation test — proves cross-tenant denial
```

## API (Phase 1)

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/organizations` | Create org (+ owner, default workspace, statuses) |
| GET | `/api/organizations` | List my orgs with role |
| GET / PATCH | `/api/organizations/:orgId` | Org detail / update (admin) |
| GET / PATCH / DELETE | `/api/organizations/:orgId/members` | List / change role / remove |
| GET / POST / DELETE | `/api/organizations/:orgId/invitations` | List / invite / revoke |
| POST | `/api/invitations/accept` | Accept an invitation token |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces?orgId=` | List workspaces in an org |
| GET / PATCH / DELETE | `/api/workspaces/:workspaceId` | Detail / update / archive |

Auth (email + password, Google OAuth, password reset) runs through server
actions in `src/app/(auth)/actions.ts` plus the `/auth/callback` and
`/auth/confirm` route handlers. MFA (TOTP) enrolls and verifies via Supabase.

## Deployment

Deploy to Vercel; link the Supabase project and push migrations with
`supabase db push`. Set all environment variables in the Vercel dashboard.
Security headers are configured in `vercel.json`.

## Roadmap

Phase 1 (this) → Work management → AI capture pipeline → Knowledge base →
Automation → Reporting. Each builds on the schema and RLS foundation here.
