-- ============================================================================
-- 0004_work.sql
-- Projects and the full task model (merged from the operational PRD):
-- priority, assigned_by/assigned_to, department, project, tags, attachments,
-- the Created→Accepted→In Progress→Completed→Verified→Closed workflow
-- (+ On Hold / Rejected / Cancelled), subtasks, dependencies, comments,
-- mentions, templates, recurrence.
-- ============================================================================

-- ── projects ──────────────────────────────────────────────────────────────────
create table projects (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name         text not null,
  description  text,
  status       text not null default 'active',   -- active | on_hold | completed | archived
  start_date   date,
  due_date     date,
  owner_id     uuid references profiles (id) on delete set null,
  archived_at  timestamptz,
  created_by   uuid not null references profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index projects_workspace_idx on projects (workspace_id);
create index projects_org_idx       on projects (org_id);
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();

-- ── task_statuses (configurable per workspace; seeded with the PRD workflow) ──
create table task_statuses (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name         text not null,
  category     task_status_category not null,
  position     int not null default 0,
  color        text not null default '#94a3b8',
  is_default   boolean not null default false,    -- status applied to new tasks
  is_terminal  boolean not null default false,    -- Closed / Cancelled / Rejected
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);
create index task_statuses_workspace_idx on task_statuses (workspace_id);

-- ── tasks ───────────────────────────────────────────────────────────────────
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  workspace_id    uuid not null references workspaces (id) on delete cascade,
  project_id      uuid references projects (id) on delete set null,
  parent_task_id  uuid references tasks (id) on delete cascade,   -- subtasks
  department_id   uuid references departments (id) on delete set null,
  status_id       uuid not null references task_statuses (id),
  title           text not null,
  description     text,
  priority        task_priority not null default 'medium',
  due_date        timestamptz,
  start_date      timestamptz,
  assigned_to     uuid references profiles (id) on delete set null,
  assigned_by     uuid references profiles (id) on delete set null,
  created_by      uuid not null references profiles (id),
  -- AI provenance: which capture produced this task, and the extractor's confidence.
  capture_id      uuid,
  source_confidence numeric(3,2),
  -- recurrence + templating
  recurrence_rule text,                                   -- RFC 5545 RRULE; null = one-off
  template_id     uuid,
  position        numeric not null default 0,             -- manual ordering within a view
  completed_at    timestamptz,
  verified_at     timestamptz,
  verified_by     uuid references profiles (id) on delete set null,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index tasks_workspace_idx  on tasks (workspace_id);
create index tasks_project_idx    on tasks (project_id);
create index tasks_assignee_idx   on tasks (org_id, assigned_to, due_date);
create index tasks_status_idx     on tasks (workspace_id, status_id);
create index tasks_parent_idx     on tasks (parent_task_id);
create index tasks_due_idx        on tasks (org_id, due_date) where completed_at is null;
create index tasks_capture_idx    on tasks (capture_id);
create trigger tasks_set_updated_at before update on tasks
  for each row execute function set_updated_at();

-- ── task_dependencies ─────────────────────────────────────────────────────────
create table task_dependencies (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations (id) on delete cascade,
  task_id        uuid not null references tasks (id) on delete cascade,
  depends_on_id  uuid not null references tasks (id) on delete cascade,
  type           dependency_type not null default 'blocks',
  created_at     timestamptz not null default now(),
  unique (task_id, depends_on_id, type),
  check (task_id <> depends_on_id)
);
create index task_dependencies_task_idx on task_dependencies (task_id);

-- ── tags ───────────────────────────────────────────────────────────────────────
create table tags (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  name       text not null,
  color      text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (org_id, name)
);
create table task_tags (
  task_id uuid not null references tasks (id) on delete cascade,
  tag_id  uuid not null references tags (id) on delete cascade,
  org_id  uuid not null references organizations (id) on delete cascade,
  primary key (task_id, tag_id)
);

-- ── comments + mentions (shared across tasks/docs/etc. via entity reference) ──
create table comments (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations (id) on delete cascade,
  workspace_id      uuid not null references workspaces (id) on delete cascade,
  entity_type       text not null,                -- 'task' | 'document' | 'meeting'
  entity_id         uuid not null,
  author_id         uuid not null references profiles (id) on delete cascade,
  body              text not null,
  parent_comment_id uuid references comments (id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index comments_entity_idx on comments (entity_type, entity_id);
create trigger comments_set_updated_at before update on comments
  for each row execute function set_updated_at();

create table comment_mentions (
  comment_id        uuid not null references comments (id) on delete cascade,
  mentioned_user_id uuid not null references profiles (id) on delete cascade,
  org_id            uuid not null references organizations (id) on delete cascade,
  primary key (comment_id, mentioned_user_id)
);
create index comment_mentions_user_idx on comment_mentions (mentioned_user_id);

-- ── attachments ────────────────────────────────────────────────────────────────
create table attachments (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations (id) on delete cascade,
  workspace_id   uuid references workspaces (id) on delete cascade,
  entity_type    text not null,                   -- 'task' | 'document' | 'capture'
  entity_id      uuid not null,
  storage_key    text not null,                   -- path in Supabase Storage
  filename       text not null,
  mime_type      text,
  size_bytes     bigint,
  scanned_status text not null default 'pending', -- pending | clean | infected
  uploaded_by    uuid not null references profiles (id),
  created_at     timestamptz not null default now()
);
create index attachments_entity_idx on attachments (entity_type, entity_id);

-- ── task_templates (reusable task definitions, incl. subtask blueprints) ──────
create table task_templates (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name         text not null,
  definition   jsonb not null default '{}'::jsonb,  -- title/desc/priority/subtasks/tags
  created_by   uuid not null references profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index task_templates_workspace_idx on task_templates (workspace_id);
create trigger task_templates_set_updated_at before update on task_templates
  for each row execute function set_updated_at();

-- FK back-references that needed both tables to exist first.
alter table tasks
  add constraint tasks_template_fk
  foreign key (template_id) references task_templates (id) on delete set null;
