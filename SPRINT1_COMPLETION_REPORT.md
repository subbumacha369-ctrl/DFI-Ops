# Sprint 1 Completion Report — Hierarchy, Member Management & RBAC

**Sprint goal:** close the deployment-blocking gaps from `DEPLOYMENT_READINESS_REPORT.md` —
employee profiles, reporting hierarchy, member management, RBAC foundation, and team assignment.
Built on the existing architecture (no rebuild). All gates green; app remains deployable.

---

## Completed features

### Employee Profile System
- Extended the membership model with **Employee ID, Designation, Department, Team, Reporting Officer,
  Join Date, Employment Status**, plus **Phone** on the global profile (Profile Picture reuses existing `avatar_url`).
- **Employee Profile page** (view) with employee details, reporting chain, and direct reports.
- **Edit member dialog** (used from the directory and the profile page) for all HR + role fields.
- **Self profile update** endpoint (`PATCH /api/profile`).

### Reporting Officer Hierarchy
- Assign / change **reporting officer** per member (edit dialog + role/profile screens).
- **View direct reports** and **full reporting chain** on each profile.
- **Organization Structure page**: reporting-tree view (recursive) + departments & teams view.

### Member Management
- **Add / Invite** (email via existing invitation flow), **Remove**, **Suspend**, **Activate**.
- **Search** (name / employee ID), **Filter** (status, role, department), **Bulk actions** (activate / suspend / remove).
- Views: **Member list**, **Member details**, **Pending invitations**.
- Org Admins manage everyone; Managers can update their **direct reports** (RLS `org_members_update_manager`).

### RBAC Foundation
- New functional role enum **`app_role`**: `super_admin, org_admin, manager, team_lead, employee, viewer`
  — layered on top of the existing tenancy role (owner/admin/member/guest) so **RLS is unchanged**.
- Central **permission matrix** (`src/lib/rbac.ts`) — single source of truth.
- Enforced in **frontend** (`useMyRole().can`, conditional UI), **backend** (`callerCan` / `loadAppRole` route guards),
  and **database** (`app_role_of`, `is_org_manager` SECURITY DEFINER helpers + manager RLS policy).
- **Role Management screen** (assign roles, capped at the actor's own level) and **Permission Matrix page** (read-only).

### Team Assignment Workflow
- Assign members to **departments** and **teams**; assign **reporting officers**; create departments/teams (`departments.manage`).
- Reflected in the org structure, profile, and directory views. (Project team assignment was already shipped via `project_members`.)

---

## Database changes — migration `0014_org_hierarchy_rbac.sql`
- `create type app_role` (6 values).
- `org_members` + `app_role, status, employee_id, designation, department_id, team_id, reporting_officer_id, join_date`
  (+ indexes on reporting/department/team). Backfilled `app_role` from the existing tenancy role (non-destructive).
- `profiles` + `phone`.
- Helpers: `app_role_of(org_id)`, `is_org_manager(org_id)` (SECURITY DEFINER).
- RLS: `org_members_update_manager` — managers may update HR fields for their own direct reports
  (org admins already had full update). No existing policy or data altered.
- Hand-authored `database.types.ts` updated to match; demo seed enriched with departments, teams, and a 5-person hierarchy.

## API changes
| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/organizations/:orgId/members` | Directory with HR + resolved officer/dept/team (enriched) |
| GET / PATCH / DELETE | `/api/organizations/:orgId/members/:userId` | Member detail + direct reports; update HR/RBAC; remove |
| GET | `/api/organizations/:orgId/me` | Caller's role + permissions (drives UI gating) |
| GET / POST | `/api/organizations/:orgId/departments` | List / create departments |
| GET / POST | `/api/organizations/:orgId/teams` | List / create teams |
| PATCH | `/api/profile` | Update own profile (name, phone, avatar, timezone) |

All mutations are permission-guarded server-side (`callerCan`) and role-capped (`assignableRoles`).

## Screens added
- `/[orgSlug]/members` — Member Management
- `/[orgSlug]/members/[userId]` — Employee Profile (+ edit dialog, reporting chain, direct reports)
- `/[orgSlug]/organization` — Organization Structure (reporting tree + departments/teams)
- `/[orgSlug]/roles` — Role Management
- `/[orgSlug]/permissions` — Permission Matrix
- Sidebar updated: Members → Org structure → Roles & access. All responsive (mobile/tablet/desktop).

## Permission matrix

| Permission | Super Admin | Org Admin | Manager | Team Lead | Employee | Viewer |
| --- | :--: | :--: | :--: | :--: | :--: | :--: |
| Manage organizations (platform) | ✓ | | | | | |
| Configure org settings | ✓ | ✓ | | | | |
| Manage members (add/remove/suspend) | ✓ | ✓ | | | | |
| Invite members | ✓ | ✓ | ✓ | | | |
| Manage departments & teams | ✓ | ✓ | | | | |
| Manage roles & permissions | ✓ | ✓ | | | | |
| Create / manage projects | ✓ | ✓ | ✓¹ | | | |
| Assign tasks (any) | ✓ | ✓ | ✓ | | | |
| Assign tasks within team | ✓ | ✓ | ✓ | ✓ | | |
| Create tasks | ✓ | ✓ | ✓ | ✓ | | |
| View team / all reports | ✓ | ✓(all) | ✓(team) | ✓(team) | | |
| Manage / monitor team | ✓ | ✓ | ✓ | monitor | | |
| Manage own tasks · comment · upload | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Read-only | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

¹ Managers can create & assign projects; "manage all projects" is Org Admin+. Full machine-readable matrix lives in `src/lib/rbac.ts` and renders at `/[orgSlug]/permissions`.

## Remaining gaps (carried forward)
- **Dynamic permission editing** (custom per-role permission toggles) — current matrix is fixed in code; the screen is read-only + role assignment.
- **Super Admin cross-org console** (platform-level org management) — role exists; no multi-org admin UI.
- **Manager-scoped RLS is partial** — managers can update direct reports; deeper team-tree scoping enforced in app layer, not fully in RLS.
- Column-level RLS (restricting *which* fields a manager edits) is enforced in the app, not the database.
- Bulk invite (CSV) and member import not included.
- Remaining non-Sprint-1 items from the readiness report (interactive dashboards, true RAG, audio meeting intel, recurring-task scheduler) are out of scope here.

## Build status
- `npm run typecheck` ✅ 0 errors
- `npm run lint` ✅ 0 warnings / 0 errors
- `npm run build` ✅ **33 routes** (clean run, no dev server)

## Test status
- `npm test` ✅ **34 passing** (5 files) — added `rbac.test.ts` (8 tests: `can`, `assignableRoles`, matrix integrity).
- Demo-mode smoke check: members directory, `/me`, and all 5 new pages return 200 with seeded hierarchy data.

## Production readiness score
- **Sprint 1 scope: ~92% complete** (blockers cleared: profiles, hierarchy, member management, RBAC foundation, team assignment).
- **Overall vs. the full enhancement doc: ≈ 70 / 100** (up from ~58). Remaining to GA: interactive dashboards,
  true vector RAG + citations, audio meeting intelligence, recurring-task scheduler, and the demo-mode/prod-provisioning checklist from `DEPLOYMENT_READINESS_REPORT.md` §8.

> Reminder: `NEXT_PUBLIC_DEMO_MODE` must be `0` in production. After linking Supabase, run `supabase db push`
> (applies migration 0014) and `npm run db:types` to regenerate types.
