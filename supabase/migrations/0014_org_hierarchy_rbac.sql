-- ============================================================================
-- 0014_org_hierarchy_rbac.sql
-- Sprint 1: employee profiles, reporting hierarchy, member status, and a
-- functional RBAC role (app_role) layered on top of the existing tenancy role.
--
-- The tenancy role (owner/admin/member/guest) continues to drive RLS data
-- access. app_role adds a finer functional role for permissions and UI, without
-- changing existing policies or data semantics.
-- ============================================================================

-- ── functional role enum ──────────────────────────────────────────────────────
create type app_role as enum (
  'super_admin', 'org_admin', 'manager', 'team_lead', 'employee', 'viewer'
);

-- ── per-org employee/HR attributes on the membership row ──────────────────────
alter table org_members
  add column app_role             app_role not null default 'employee',
  add column status               text not null default 'active',  -- active | suspended | invited
  add column employee_id          text,
  add column designation          text,
  add column department_id        uuid references departments (id) on delete set null,
  add column team_id              uuid references teams (id) on delete set null,
  add column reporting_officer_id uuid references profiles (id) on delete set null,
  add column join_date            date;

create index org_members_reporting_idx on org_members (org_id, reporting_officer_id);
create index org_members_department_idx on org_members (department_id);
create index org_members_team_idx on org_members (team_id);

-- Backfill the functional role from the existing tenancy role.
update org_members set app_role = case
  when role = 'owner' then 'super_admin'::app_role
  when role = 'admin' then 'org_admin'::app_role
  when role = 'guest' then 'viewer'::app_role
  else 'employee'::app_role
end;

-- Personal contact field on the global profile.
alter table profiles add column phone text;

-- ── RBAC helpers (SECURITY DEFINER so policies can call them) ─────────────────
create or replace function app_role_of(p_org_id uuid)
returns app_role language sql security definer set search_path = public stable as $$
  select app_role from org_members where org_id = p_org_id and user_id = auth.uid() limit 1;
$$;

create or replace function is_org_manager(p_org_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = auth.uid()
      and app_role in ('super_admin', 'org_admin', 'manager')
  );
$$;

-- ── RLS: let managers update HR fields for their own direct reports ────────────
-- (org admins already have full update via org_members_update_admin.)
create policy org_members_update_manager on org_members for update
  using (is_org_manager(org_id) and reporting_officer_id = auth.uid())
  with check (is_org_manager(org_id));
