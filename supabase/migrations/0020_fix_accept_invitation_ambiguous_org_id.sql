-- accept_invitation's RETURNS TABLE (org_id ...) output parameter collided with
-- the bare `org_id` in `on conflict (org_id, user_id)`, raising
-- "column reference org_id is ambiguous" under the default variable_conflict=error.
-- `#variable_conflict use_column` resolves bare names to columns; all genuine
-- variables here are prefixed (v_*) or record fields, so this is safe.
create or replace function accept_invitation(p_token text)
returns table (org_id uuid, org_slug text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
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

  insert into org_members (org_id, user_id, role, status)
  values (v_inv.org_id, v_uid, v_inv.role, 'invited')
  on conflict (org_id, user_id) do nothing;

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
