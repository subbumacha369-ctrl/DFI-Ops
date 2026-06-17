-- ============================================================================
-- 0015_dynamic_rbac.sql
-- Sprint 2: a DB-backed, editable permission matrix and feature-visibility layer
-- on top of the Sprint-1 app_role. Both are *overrides*: absence of a row means
-- "use the code default" (src/lib/rbac.ts), so existing behavior is preserved.
-- Permission/visibility changes are recorded in the append-only audit_events log.
-- ============================================================================

-- ── per-org role × module × action permission overrides ───────────────────────
create table role_permissions (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  app_role   app_role not null,
  module     text not null,
  action     text not null,
  allowed    boolean not null default true,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (org_id, app_role, module, action)
);
create index role_permissions_org_idx on role_permissions (org_id);

-- ── per-org role × feature visibility overrides (nav items + dashboard widgets) ─
create table feature_visibility (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  app_role    app_role not null,
  feature_key text not null,
  hidden      boolean not null default false,
  updated_by  uuid references profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  unique (org_id, app_role, feature_key)
);
create index feature_visibility_org_idx on feature_visibility (org_id);

-- ── RLS: any org member may read the effective config; only admins may change it ─
alter table role_permissions  enable row level security;
alter table feature_visibility enable row level security;

create policy role_permissions_select on role_permissions for select using (is_org_member(org_id));
create policy role_permissions_write  on role_permissions for all
  using (is_org_admin(org_id)) with check (is_org_admin(org_id));

create policy feature_visibility_select on feature_visibility for select using (is_org_member(org_id));
create policy feature_visibility_write  on feature_visibility for all
  using (is_org_admin(org_id)) with check (is_org_admin(org_id));

-- audit_events (0009) already stores actor/action/entity/before/after — reused here.
