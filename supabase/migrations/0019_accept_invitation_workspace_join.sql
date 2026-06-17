-- Make invitation acceptance fully wire the user into the org:
--   1. Create the org membership (as before) but mark it `invited` so an admin
--      activates the user before assigning a functional role.
--   2. Auto-add the user to the org's default (oldest, non-archived) workspace
--      so they immediately appear under workspace members.
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

  -- Join the org. New joiners await admin activation (status 'invited').
  insert into org_members (org_id, user_id, role, status)
  values (v_inv.org_id, v_uid, v_inv.role, 'invited')
  on conflict (org_id, user_id) do nothing;

  -- Auto-add to the org's default (oldest active) workspace so they show up
  -- under workspace members right away.
  insert into workspace_members (workspace_id, org_id, user_id, role)
  select w.id, w.org_id, v_uid, 'member'
  from workspaces w
  where w.org_id = v_inv.org_id and w.archived_at is null
  order by w.created_at asc
  limit 1
  on conflict (workspace_id, user_id) do nothing;

  update org_invitations set status = 'accepted' where id = v_inv.id;

  insert into audit_events (org_id, actor_id, action, entity_type, entity_id, after)
  values (v_inv.org_id, v_uid, 'invitation.accepted', 'org_invitation', v_inv.id,
          jsonb_build_object('email', v_email));

  select slug into v_slug from organizations where id = v_inv.org_id;
  return query select v_inv.org_id, v_slug;
end;
$$;
