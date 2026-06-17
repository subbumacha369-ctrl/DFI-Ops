-- ============================================================================
-- 0009_audit.sql
-- Append-only audit trail. No UPDATE/DELETE is permitted, even by table owners
-- via RLS — the log is tamper-evident by construction.
-- ============================================================================

create table audit_events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  actor_id    uuid references profiles (id) on delete set null,
  actor_type  actor_type not null default 'user',
  action      text not null,                  -- e.g. 'organization.created'
  entity_type text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);
create index audit_events_org_idx on audit_events (org_id, created_at desc);
create index audit_events_entity_idx on audit_events (entity_type, entity_id);

-- Block updates and deletes at the trigger level (defence in depth alongside RLS).
create or replace function prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

create trigger audit_events_no_update before update on audit_events
  for each row execute function prevent_mutation();
create trigger audit_events_no_delete before delete on audit_events
  for each row execute function prevent_mutation();
