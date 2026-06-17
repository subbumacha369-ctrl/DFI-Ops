-- org_invitations.token defaults to encode(gen_random_bytes(24),'hex'). gen_random_bytes
-- lives in the `extensions` schema on Supabase; schema-qualify it so invitation
-- inserts never depend on the inserting role's search_path (same class of issue
-- fixed for create_organization in 0016).
alter table public.org_invitations
  alter column token set default encode(extensions.gen_random_bytes(24), 'hex');
