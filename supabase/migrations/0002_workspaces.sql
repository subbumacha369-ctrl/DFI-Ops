-- ============================================================================
-- 0002_workspaces.sql
-- Workspaces are containers within an org for a team / program / initiative.
-- ============================================================================

create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  name        text not null,
  icon        text,
  description text,
  settings    jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_by  uuid not null references profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index workspaces_org_idx on workspaces (org_id);
create trigger workspaces_set_updated_at before update on workspaces
  for each row execute function set_updated_at();

create table workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  org_id       uuid not null references organizations (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  role         workspace_role not null default 'member',
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_members_user_idx on workspace_members (user_id);
create index workspace_members_ws_idx   on workspace_members (workspace_id);
create index workspace_members_org_idx  on workspace_members (org_id);
