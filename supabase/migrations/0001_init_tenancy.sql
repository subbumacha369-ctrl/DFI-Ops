-- ============================================================================
-- 0001_init_tenancy.sql
-- Extensions, enums, shared trigger functions, and core multi-tenant tables.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "vector";          -- pgvector for RAG (used in 0006)
create extension if not exists "pg_trgm";         -- fuzzy search

-- ── Enums ───────────────────────────────────────────────────────────────────
create type org_role            as enum ('owner', 'admin', 'member', 'guest');
create type workspace_role      as enum ('admin', 'member', 'guest');
create type invitation_status   as enum ('pending', 'accepted', 'revoked', 'expired');

create type task_priority        as enum ('low', 'medium', 'high', 'critical');
create type task_status_category as enum ('open', 'in_progress', 'done', 'cancelled');
create type dependency_type      as enum ('blocks', 'relates', 'duplicates');

create type capture_source_type  as enum ('meeting', 'voice', 'document', 'chat', 'project_update', 'nl');
create type capture_status       as enum ('received', 'transcribing', 'extracting', 'reviewed', 'failed');
create type work_draft_status    as enum ('pending', 'accepted', 'edited', 'rejected');

create type document_type        as enum ('doc', 'sop', 'policy');
create type document_status      as enum ('draft', 'published', 'archived');

create type notification_channel as enum ('in_app', 'email', 'whatsapp', 'sms', 'voice');
create type notification_type    as enum (
  'task_assigned', 'task_updated', 'task_completed', 'comment_added',
  'mention', 'deadline_approaching', 'task_overdue', 'invitation',
  'capture_processed', 'report_ready', 'automation'
);

create type automation_trigger_type as enum (
  'task_created', 'task_status_changed', 'task_due_soon', 'task_overdue',
  'comment_added', 'mentioned', 'capture_processed', 'schedule'
);
create type report_type   as enum ('weekly', 'monthly', 'custom');
create type report_status as enum ('queued', 'running', 'completed', 'failed');
create type actor_type    as enum ('user', 'service', 'ai');

-- ── Shared trigger: maintain updated_at ──────────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles (public mirror of auth.users) ───────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  locale      text not null default 'en',
  timezone    text not null default 'UTC',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ── organizations (the tenant boundary) ──────────────────────────────────────
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  plan        text not null default 'free',
  locale      text not null default 'en',
  timezone    text not null default 'UTC',
  settings    jsonb not null default '{}'::jsonb,
  status      text not null default 'active',
  created_by  uuid not null references profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index organizations_slug_idx on organizations (slug);
create trigger organizations_set_updated_at before update on organizations
  for each row execute function set_updated_at();

-- ── org_members (who belongs to an org, and their org-level role) ────────────
create table org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  role       org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index org_members_user_idx on org_members (user_id);
create index org_members_org_idx  on org_members (org_id);

-- ── org_invitations ──────────────────────────────────────────────────────────
create table org_invitations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  email      text not null,
  role       org_role not null default 'member',
  token      text not null unique default encode(gen_random_bytes(24), 'hex'),
  status     invitation_status not null default 'pending',
  invited_by uuid not null references profiles (id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  unique (org_id, email, status)
);
create index org_invitations_token_idx on org_invitations (token);
create index org_invitations_email_idx on org_invitations (lower(email));

-- ── departments (people grouping) ─────────────────────────────────────────────
create table departments (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  name       text not null,
  parent_id  uuid references departments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index departments_org_idx on departments (org_id);
create trigger departments_set_updated_at before update on departments
  for each row execute function set_updated_at();

-- ── teams ─────────────────────────────────────────────────────────────────────
create table teams (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  department_id uuid references departments (id) on delete set null,
  name          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index teams_org_idx on teams (org_id);
create trigger teams_set_updated_at before update on teams
  for each row execute function set_updated_at();

create table team_members (
  team_id    uuid not null references teams (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on team_members (user_id);
