-- ============================================================================
-- 0003_helpers.sql
-- Membership/role helper functions used inside RLS policies.
--
-- These are SECURITY DEFINER so they bypass RLS when reading membership tables.
-- That is what prevents infinite recursion (a policy on org_members that needs
-- to read org_members) and keeps policies fast and readable.
-- ============================================================================

-- Is the current user a member of this org?
create or replace function is_org_member(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = auth.uid()
  );
$$;

-- Current user's role in an org (null if not a member).
create or replace function org_role_of(p_org_id uuid)
returns org_role
language sql
security definer
set search_path = public
stable
as $$
  select role from org_members
  where org_id = p_org_id and user_id = auth.uid()
  limit 1;
$$;

-- Is the current user an owner/admin of this org?
create or replace function is_org_admin(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Is the current user a member of this workspace?
create or replace function is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  );
$$;

-- Is the current user an admin of this workspace (or an org admin above it)?
create or replace function is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
  or exists (
    select 1 from workspaces w
    join org_members om on om.org_id = w.org_id
    where w.id = p_workspace_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  );
$$;
