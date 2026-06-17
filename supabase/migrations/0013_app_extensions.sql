-- ============================================================================
-- 0013_app_extensions.sql
-- Application-layer additions used by the work & knowledge modules:
--   • project milestones
--   • project team membership (assignment)
--   • knowledge-base categories
-- All tenant-scoped and RLS-guarded like the rest of the schema.
-- ============================================================================

-- ── milestones ────────────────────────────────────────────────────────────────
create table milestones (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  project_id  uuid not null references projects (id) on delete cascade,
  name        text not null,
  description text,
  due_date    date,
  status      text not null default 'open',   -- open | completed
  position    int  not null default 0,
  completed_at timestamptz,
  created_by  uuid not null references profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index milestones_project_idx on milestones (project_id);
create trigger milestones_set_updated_at before update on milestones
  for each row execute function set_updated_at();

-- Optional milestone pointer on tasks (a task can belong to a milestone).
alter table tasks
  add column milestone_id uuid references milestones (id) on delete set null;
create index tasks_milestone_idx on tasks (milestone_id);

-- ── project_members (team assignment) ─────────────────────────────────────────
create table project_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  role       text not null default 'member',  -- lead | member
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index project_members_project_idx on project_members (project_id);
create index project_members_user_idx on project_members (user_id);

-- ── document categories ───────────────────────────────────────────────────────
create table document_categories (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name         text not null,
  color        text not null default '#64748b',
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);
create index document_categories_workspace_idx on document_categories (workspace_id);

alter table documents
  add column category_id uuid references document_categories (id) on delete set null;
create index documents_category_idx on documents (category_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────────
alter table milestones          enable row level security;
alter table project_members     enable row level security;
alter table document_categories enable row level security;

create policy milestones_all on milestones for all
  using (exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id)))
  with check (exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id)));

create policy project_members_select on project_members for select
  using (exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id)));
create policy project_members_write on project_members for all
  using (exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id)))
  with check (exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id)));

create policy document_categories_select on document_categories for select
  using (is_workspace_member(workspace_id));
create policy document_categories_write on document_categories for all
  using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- Allow workspace members to write extractions for captures they can access.
-- (0010 only granted SELECT, assuming a service-role worker; the app runs the
-- Capture→Extract step synchronously with the member's own client.)
create policy extractions_insert_member on extractions for insert
  with check (exists (
    select 1 from captures c where c.id = capture_id and is_workspace_member(c.workspace_id)
  ));

-- Realtime for live task boards already covers tasks; add milestones.
alter publication supabase_realtime add table milestones;
