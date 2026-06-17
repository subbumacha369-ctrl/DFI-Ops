-- ============================================================================
-- 0007_automation.sql
-- No-code automation: Trigger → Condition(s) → Action(s).
-- The overdue-escalation pattern is just a prebuilt rule, not special-cased.
-- ============================================================================

create table automation_rules (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name         text not null,
  trigger_type automation_trigger_type not null,
  trigger      jsonb not null default '{}'::jsonb,   -- trigger params (e.g. days_overdue)
  conditions   jsonb not null default '[]'::jsonb,   -- [{field, op, value}, ...] (AND)
  enabled      boolean not null default true,
  created_by   uuid not null references profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index automation_rules_workspace_idx on automation_rules (workspace_id);
create index automation_rules_trigger_idx on automation_rules (trigger_type) where enabled;
create trigger automation_rules_set_updated_at before update on automation_rules
  for each row execute function set_updated_at();

create table automation_actions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  rule_id     uuid not null references automation_rules (id) on delete cascade,
  position    int not null default 0,
  action_type text not null,                         -- assign | set_status | notify | ...
  params      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index automation_actions_rule_idx on automation_actions (rule_id);

create table automation_run_logs (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations (id) on delete cascade,
  rule_id    uuid not null references automation_rules (id) on delete cascade,
  context    jsonb not null default '{}'::jsonb,
  result     text not null,                          -- success | skipped | error
  error      text,
  fired_at   timestamptz not null default now()
);
create index automation_run_logs_rule_idx on automation_run_logs (rule_id, fired_at desc);
