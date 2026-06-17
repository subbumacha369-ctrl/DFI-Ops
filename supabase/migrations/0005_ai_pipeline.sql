-- ============================================================================
-- 0005_ai_pipeline.sql
-- The Capture → Extract → Confirm → Track engine.
-- Every source (meeting, voice, doc, chat, update, NL) is one capture row.
-- ============================================================================

create table captures (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations (id) on delete cascade,
  workspace_id   uuid not null references workspaces (id) on delete cascade,
  source_type    capture_source_type not null,
  title          text,
  raw_storage_key text,                 -- audio/file in Storage (null for pasted text)
  raw_text       text,                  -- normalized text (transcript / pasted content)
  status         capture_status not null default 'received',
  error          text,
  created_by     uuid not null references profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index captures_workspace_idx on captures (workspace_id);
create index captures_status_idx    on captures (status);
create trigger captures_set_updated_at before update on captures
  for each row execute function set_updated_at();

-- A meeting is a capture with structured meeting metadata.
create table meetings (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  capture_id   uuid not null references captures (id) on delete cascade,
  title        text not null,
  occurred_at  timestamptz,
  participants jsonb not null default '[]'::jsonb,
  summary      text,
  decisions    jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);
create index meetings_capture_idx on meetings (capture_id);

-- One AI extraction run over a capture.
create table extractions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  capture_id  uuid not null references captures (id) on delete cascade,
  model       text not null,
  summary     text,
  output      jsonb not null default '{}'::jsonb,  -- full structured model output
  token_cost  int,
  created_at  timestamptz not null default now()
);
create index extractions_capture_idx on extractions (capture_id);

-- Candidate tasks proposed by extraction, pending human confirmation.
create table work_drafts (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizations (id) on delete cascade,
  workspace_id        uuid not null references workspaces (id) on delete cascade,
  extraction_id       uuid not null references extractions (id) on delete cascade,
  title               text not null,
  description         text,
  suggested_assignee_id uuid references profiles (id) on delete set null,
  suggested_due_date  timestamptz,
  suggested_project_id uuid references projects (id) on delete set null,
  priority            task_priority not null default 'medium',
  confidence          numeric(3,2) not null default 0.5,
  status              work_draft_status not null default 'pending',
  committed_task_id   uuid references tasks (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index work_drafts_extraction_idx on work_drafts (extraction_id);
create index work_drafts_workspace_status_idx on work_drafts (workspace_id, status);
create trigger work_drafts_set_updated_at before update on work_drafts
  for each row execute function set_updated_at();

-- Provenance FK now that captures exists.
alter table tasks
  add constraint tasks_capture_fk
  foreign key (capture_id) references captures (id) on delete set null;
