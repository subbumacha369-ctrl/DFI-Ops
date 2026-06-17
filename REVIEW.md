# Operations OS — Review Build

AI-native operations management: **Capture → Extract → Confirm → Track**, built on a
multi-tenant Next.js 15 + Supabase foundation with database-enforced row-level security.

This document is the review summary for the full build (Phase 1 foundation + all nine
product modules).

---

## Build status

| Gate | Command | Result |
| --- | --- | --- |
| Install | `npm install` | ✅ pass |
| Type check | `npm run typecheck` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 warnings / 0 errors |
| Production build | `npm run build` | ✅ 32 routes compiled |
| Unit tests | `npm test` | ✅ 26 passed (4 files) |

The app boots with placeholder credentials (`.env.local`); real Supabase + Anthropic +
Upstash + Resend keys are needed for live data, AI, rate limiting, and email.

---

## Features completed

### 1. Task Management
- **CRUD** — create / edit (inline) / soft-delete (archive).
- **Status workflow** — Created → Accepted → In Progress → On Hold → Completed → Verified
  → Closed (+ Rejected / Cancelled), seeded per workspace; moving to a `done`-category
  status sets `completed_at`, "Verified" stamps `verified_at`/`verified_by`.
- **Subtasks** — nested via `parent_task_id`, added from the task detail panel.
- **Dependencies** — blocks / relates / duplicates edges between tasks.
- **Attachments** — signed-upload to a private Storage bucket, signed-download list, delete.
- **Comments & mentions** — threaded comments; @-mention picker notifies mentioned users.
- **Templates** — save a task (with subtask blueprint) and instantiate it later.
- **Recurring tasks** — RRULE subset (daily/weekly/monthly/yearly + interval); completing a
  recurring task spawns the next occurrence.
- **Views** — **List**, **Kanban** (drag-and-drop between status columns), **Calendar**
  (month grid by due date).

### 2. Projects
- **CRUD**, status (active / on hold / completed / archived).
- **Milestones** — add, toggle complete, due dates.
- **Team assignment** — add/remove members with roles (lead / member).
- **Progress tracking** — live completion % from task status categories; project dashboard
  with progress, milestones, team, and an embedded project-scoped task board.

### 3. Notifications
- **In-app** — topbar bell with unread badge + dropdown; full notification center page.
- **Email** — best-effort transactional email via Resend on assignment/mention/etc.
- Triggers wired: task assigned, task updated/completed, comment added, mention, automation.
- Per-user **notification preferences** (type × channel) endpoint.

### 4. Dashboard
- **Manager dashboard** — 6 KPI cards (total, completed, pending, overdue, active projects,
  completion rate) computed under RLS.
- **Project dashboard** — per-project progress + milestones + team.
- **Charts** — task trend (created vs completed, 14d), completion donut, workload bars,
  priority breakdown (all inline SVG, themed via CSS tokens).
- **Heatmap** — team-load heatmap by assignee.

### 5. Activity Feed
- Org- and workspace-scoped feed from `activity_events`, written on task/project/document/
  capture/automation actions, rendered with actor avatars and verbs.

### 6. Knowledge Base
- **Documents / SOPs / Policies** with type + status (draft/published/archived).
- **Versioning** — every save creates a new `doc_versions` row; history shown in the editor.
- **Categories** table + endpoint.
- **Search** — keyword (title + body) and **AI search** (Claude answer grounded in
  workspace documents, with keyword fallback when no API key).

### 7. AI Capture Pipeline
- Sources: **meeting transcript, voice note, document, natural-language request**.
- **Capture → Extract** — Claude extraction (summary, decisions, draft tasks) with a
  deterministic heuristic fallback when `ANTHROPIC_API_KEY` is absent.
- **Confirm → Track** — review drafts, confirm (→ real task with provenance) or reject;
  meeting captures also persist meeting metadata.

### 8. Automation Engine
- **Trigger → Conditions → Actions** rules; enable/disable; run-now evaluation with
  run logs.
- Actions: notify, set priority, set status, assign, create follow-up.
- Prebuilt **templates**: overdue reminder, follow-up on completion, escalate critical.

### 9. Reporting
- **Weekly / monthly / custom** report definitions.
- **Generate run** — grounded metrics (source of truth) + AI narrative summary (with a
  deterministic fallback); run history with metric cards.

---

## Screens implemented

| Area | Route |
| --- | --- |
| Manager dashboard | `/[orgSlug]/dashboard` |
| Activity feed | `/[orgSlug]/activity` |
| Reports | `/[orgSlug]/reports` |
| Notification center | `/[orgSlug]/notifications` |
| Org settings / members | `/[orgSlug]/settings/general`, `/settings/members` |
| Workspace overview | `/[orgSlug]/w/[workspaceId]` |
| Tasks (List/Kanban/Calendar) | `/[orgSlug]/w/[workspaceId]/tasks` |
| Projects + detail | `/[orgSlug]/w/[workspaceId]/projects`, `/projects/[projectId]` |
| Knowledge base + editor | `/[orgSlug]/w/[workspaceId]/knowledge`, `/knowledge/[documentId]` |
| AI capture | `/[orgSlug]/w/[workspaceId]/capture` |
| Automations | `/[orgSlug]/w/[workspaceId]/automations` |
| Auth (login/signup/reset/MFA) | `/(auth)/*` |
| Onboarding (create org / accept invite) | `/(onboarding)/*` |

Shared chrome: workspace-aware sidebar (org nav + per-workspace module nav), topbar with
notification bell and user/theme menu.

## API endpoints (REST, all RLS-scoped)

- **Tasks** — `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`,
  `GET/POST /api/tasks/:id/comments`, `GET/POST/DELETE /api/tasks/:id/dependencies`,
  `GET/POST/DELETE /api/tasks/:id/attachments`, `GET /api/task-statuses`,
  `GET/POST /api/task-templates`, `POST /api/task-templates/:id/instantiate`, `GET/POST /api/tags`
- **Projects** — `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`,
  `GET/POST /api/projects/:id/milestones`, `PATCH/DELETE /api/projects/:id/milestones/:mid`,
  `GET/POST/DELETE /api/projects/:id/members`
- **Knowledge** — `GET/POST /api/documents`, `GET/PATCH/DELETE /api/documents/:id`,
  `GET /api/documents/search`, `GET/POST /api/document-categories`
- **AI pipeline** — `GET/POST /api/captures`, `GET /api/captures/:id`,
  `PATCH /api/work-drafts/:id`, `POST /api/work-drafts/:id/confirm`
- **Automation** — `GET/POST /api/automations`, `GET/PATCH/DELETE /api/automations/:id`,
  `POST /api/automations/:id/run`
- **Reporting** — `GET/POST /api/reports`, `GET/DELETE /api/reports/:id`,
  `GET/POST /api/reports/:id/runs`
- **Notifications** — `GET /api/notifications`, `PATCH /api/notifications/:id`,
  `POST /api/notifications/read-all`, `GET/PUT /api/notification-preferences`
- **Activity / metrics** — `GET /api/activity`, `GET /api/metrics`
- **Phase 1** — organizations, members, invitations, workspaces, invitation accept

## Database tables

42 tables across 13 migrations. Phase 1: `profiles, organizations, org_members,
org_invitations, departments, teams, team_members, workspaces, workspace_members`.
Work: `projects, task_statuses, tasks, task_dependencies, tags, task_tags, comments,
comment_mentions, attachments, task_templates`. AI: `captures, meetings, extractions,
work_drafts`. Knowledge: `documents, doc_versions, doc_chunks, sop_runs`. Automation:
`automation_rules, automation_actions, automation_run_logs`. Comms/reporting:
`notifications, notification_preferences, activity_events, report_definitions, report_runs,
ai_conversations, ai_messages`. Audit: `audit_events` (append-only).
**Migration `0013_app_extensions.sql`** adds `milestones, project_members,
document_categories` (+ `tasks.milestone_id`, `documents.category_id`) and a member-insert
RLS policy for `extractions` so the synchronous capture flow works with the user's client.

Every tenant table has RLS keyed on `org_id`/`workspace_id` via `SECURITY DEFINER` helper
functions — a forgotten filter in app code cannot leak across tenants.

## Test results

`npm test` → **26 passing** across 4 files:
- `utils.test.ts` (5), `validations.test.ts` (6) — Phase 1
- `recurrence.test.ts` (8) — RRULE parse / next-occurrence / describe
- `module-validations.test.ts` (7) — task/project/document/capture/automation/report schemas

Also available: `npm run test:e2e` (Playwright auth smoke), `supabase test db` (pgTAP RLS
isolation).

## Remaining issues / follow-ups

- **Live credentials required** for real use: Supabase URL/keys, `ANTHROPIC_API_KEY`
  (AI falls back to heuristics without it), Upstash (rate limiting fails open), Resend (email
  best-effort).
- **Embeddings / vector RAG**: `doc_chunks` + pgvector exist and AI search reads document
  bodies directly; a background embedding worker for large corpora is not yet wired.
- **Automation triggers** run on-demand ("Run") and for data-driven triggers (overdue / due
  soon); event-driven firing on every task mutation would need a DB trigger or queue worker.
- **Scheduled reports**: definitions support a `schedule` (cron) field; an actual scheduler
  (cron/edge function) is not yet deployed — generation is on-demand.
- **Realtime UI**: tables are in the realtime publication; the client currently uses React
  Query polling rather than live subscriptions.
- Regenerate `src/types/database.types.ts` with `npm run db:types` once a Supabase project is
  linked (the hand-authored types match the migrations).

## Deployment instructions (Vercel)

1. Push the repo and **Import** the project in Vercel (Next.js auto-detected; `vercel.json`
   sets framework, build command, region `bom1`, and security headers).
2. Create a Supabase project. Set **Environment Variables** in Vercel from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SITE_URL` (prod URL), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_FAST/SMART`,
   `UPSTASH_REDIS_REST_URL/TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `GOOGLE_CLIENT_ID/SECRET`.
3. Link Supabase and push the schema: `supabase link --project-ref <ref>` then
   `supabase db push` (applies migrations 0001–0013, including the attachments bucket).
4. In Supabase **Auth → URL configuration** add the Vercel domain redirect URLs
   (`/auth/callback`, `/auth/confirm`) and configure the Google OAuth redirect.
5. **Deploy.** Then set `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy so OAuth and
   email links resolve correctly. Optionally run `npm run seed` against the project for demo data.
