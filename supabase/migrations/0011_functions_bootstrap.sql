-- ============================================================================
-- 0011_functions_bootstrap.sql
-- Atomic, authorized provisioning. SECURITY DEFINER functions run with elevated
-- rights, so each one re-checks authorization explicitly before mutating.
-- ============================================================================

-- ── New auth user → profile row ───────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Seed the default task workflow for a workspace ────────────────────────────
create or replace function seed_default_task_statuses(p_org_id uuid, p_workspace_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into task_statuses (org_id, workspace_id, name, category, position, color, is_default, is_terminal)
  values
    (p_org_id, p_workspace_id, 'Created',     'open',        0, '#94a3b8', true,  false),
    (p_org_id, p_workspace_id, 'Accepted',    'open',        1, '#38bdf8', false, false),
    (p_org_id, p_workspace_id, 'In Progress', 'in_progress', 2, '#6366f1', false, false),
    (p_org_id, p_workspace_id, 'On Hold',     'in_progress', 3, '#f59e0b', false, false),
    (p_org_id, p_workspace_id, 'Completed',   'done',        4, '#22c55e', false, false),
    (p_org_id, p_workspace_id, 'Verified',    'done',        5, '#16a34a', false, false),
    (p_org_id, p_workspace_id, 'Closed',      'done',        6, '#0f766e', false, true),
    (p_org_id, p_workspace_id, 'Rejected',    'cancelled',   7, '#ef4444', false, true),
    (p_org_id, p_workspace_id, 'Cancelled',   'cancelled',   8, '#71717a', false, true);
$$;

-- ── slugify ────────────────────────────────────────────────────────────────────
create or replace function slugify(p_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(lower(coalesce(p_text, 'org')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ── create_organization: org + owner + default workspace + statuses ───────────
create or replace function create_organization(p_name text, p_timezone text default 'UTC')
returns table (org_id uuid, org_slug text, workspace_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_org_id     uuid;
  v_slug       text;
  v_workspace  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Unique slug: base + short random suffix.
  v_slug := slugify(p_name) || '-' || substr(encode(gen_random_bytes(3), 'hex'), 1, 5);

  insert into organizations (name, slug, timezone, created_by)
  values (p_name, v_slug, p_timezone, v_uid)
  returning id into v_org_id;

  insert into org_members (org_id, user_id, role)
  values (v_org_id, v_uid, 'owner');

  insert into workspaces (org_id, name, created_by)
  values (v_org_id, 'General', v_uid)
  returning id into v_workspace;

  insert into workspace_members (workspace_id, org_id, user_id, role)
  values (v_workspace, v_org_id, v_uid, 'admin');

  perform seed_default_task_statuses(v_org_id, v_workspace);

  insert into audit_events (org_id, actor_id, action, entity_type, entity_id, after)
  values (v_org_id, v_uid, 'organization.created', 'organization', v_org_id,
          jsonb_build_object('name', p_name, 'slug', v_slug));

  return query select v_org_id, v_slug, v_workspace;
end;
$$;

-- ── create_workspace: workspace + creator-as-admin + statuses ─────────────────
create or replace function create_workspace(
  p_org_id uuid, p_name text, p_icon text default null, p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ws  uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not is_org_member(p_org_id) then raise exception 'forbidden: not an org member'; end if;

  insert into workspaces (org_id, name, icon, description, created_by)
  values (p_org_id, p_name, p_icon, p_description, v_uid)
  returning id into v_ws;

  insert into workspace_members (workspace_id, org_id, user_id, role)
  values (v_ws, p_org_id, v_uid, 'admin');

  perform seed_default_task_statuses(p_org_id, v_ws);

  insert into audit_events (org_id, actor_id, action, entity_type, entity_id, after)
  values (p_org_id, v_uid, 'workspace.created', 'workspace', v_ws,
          jsonb_build_object('name', p_name));

  return v_ws;
end;
$$;

-- ── accept_invitation: token → org membership ────────────────────────────────
create or replace function accept_invitation(p_token text)
returns table (org_id uuid, org_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_inv   org_invitations%rowtype;
  v_slug  text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select email into v_email from profiles where id = v_uid;

  select * into v_inv from org_invitations
  where token = p_token and status = 'pending'
  limit 1;

  if not found then raise exception 'invitation not found or already used'; end if;
  if v_inv.expires_at < now() then
    update org_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'invitation expired';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'invitation was issued to a different email';
  end if;

  insert into org_members (org_id, user_id, role)
  values (v_inv.org_id, v_uid, v_inv.role)
  on conflict (org_id, user_id) do nothing;

  update org_invitations set status = 'accepted' where id = v_inv.id;

  insert into audit_events (org_id, actor_id, action, entity_type, entity_id, after)
  values (v_inv.org_id, v_uid, 'invitation.accepted', 'org_invitation', v_inv.id,
          jsonb_build_object('email', v_email));

  select slug into v_slug from organizations where id = v_inv.org_id;
  return query select v_inv.org_id, v_slug;
end;
$$;
