-- ============================================================================
-- 0008_comms_reporting.sql
-- Notifications, activity feed, reporting, and AI assistant conversations.
-- ============================================================================

-- ── notifications ─────────────────────────────────────────────────────────────
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  type       notification_type not null,
  channel    notification_channel not null default 'in_app',
  title      text not null,
  body       text,
  payload    jsonb not null default '{}'::jsonb,      -- {entity_type, entity_id, url}
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, read_at, created_at desc);

create table notification_preferences (
  user_id   uuid not null references profiles (id) on delete cascade,
  org_id    uuid not null references organizations (id) on delete cascade,
  type      notification_type not null,
  channel   notification_channel not null,
  enabled   boolean not null default true,
  frequency text not null default 'instant',         -- instant | daily_digest | off
  primary key (user_id, org_id, type, channel)
);

-- ── activity feed ──────────────────────────────────────────────────────────────
create table activity_events (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  workspace_id uuid references workspaces (id) on delete cascade,
  actor_id     uuid references profiles (id) on delete set null,
  actor_type   actor_type not null default 'user',
  verb         text not null,                          -- created | updated | completed ...
  object_type  text not null,
  object_id    uuid not null,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index activity_events_workspace_idx on activity_events (workspace_id, created_at desc);
create index activity_events_object_idx on activity_events (object_type, object_id);

-- ── reporting ───────────────────────────────────────────────────────────────────
create table report_definitions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  workspace_id uuid references workspaces (id) on delete cascade,
  name         text not null,
  type         report_type not null,
  scope        jsonb not null default '{}'::jsonb,     -- {workspace_id, project_id, ...}
  schedule     text,                                   -- cron; null = on-demand
  recipients   jsonb not null default '[]'::jsonb,
  created_by   uuid not null references profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index report_definitions_org_idx on report_definitions (org_id);
create trigger report_definitions_set_updated_at before update on report_definitions
  for each row execute function set_updated_at();

create table report_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  definition_id uuid not null references report_definitions (id) on delete cascade,
  period_start  date,
  period_end    date,
  status        report_status not null default 'queued',
  metrics       jsonb not null default '{}'::jsonb,    -- grounded numbers (source of truth)
  ai_summary    text,
  output_key    text,                                  -- exported file in Storage
  error         text,
  generated_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index report_runs_definition_idx on report_runs (definition_id, created_at desc);

-- ── AI assistant conversations ───────────────────────────────────────────────
create table ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  workspace_id uuid references workspaces (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index ai_conversations_user_idx on ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_set_updated_at before update on ai_conversations
  for each row execute function set_updated_at();

create table ai_messages (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  role            text not null,                       -- user | assistant
  content         text not null,
  citations       jsonb not null default '[]'::jsonb,  -- RAG source references
  created_at      timestamptz not null default now()
);
create index ai_messages_conversation_idx on ai_messages (conversation_id, created_at);
