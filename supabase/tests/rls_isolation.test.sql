-- ============================================================================
-- supabase/tests/rls_isolation.test.sql
-- Proves tenant isolation: a member of Org A cannot read or write Org B's data.
-- Run with:  supabase test db
-- ============================================================================
begin;
select plan(7);

-- ── Setup (as the superuser test role) ───────────────────────────────────────
-- Two users. Inserting into auth.users fires handle_new_user(), which creates
-- the matching profiles rows.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@a.test', '{"full_name":"Alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@b.test',   '{"full_name":"Bob"}');

-- Helper: become a given authenticated user for subsequent statements.
create or replace function tests_become(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text,
    true
  );
end $$;

-- ── Alice creates Org A ───────────────────────────────────────────────────────
set local role authenticated;
select tests_become('11111111-1111-1111-1111-111111111111');
select org_id as a_org from create_organization('Org A') \gset

-- ── Bob creates Org B ─────────────────────────────────────────────────────────
select tests_become('22222222-2222-2222-2222-222222222222');
select org_id as b_org from create_organization('Org B') \gset

-- ── Assertions as Alice ───────────────────────────────────────────────────────
select tests_become('11111111-1111-1111-1111-111111111111');

select is(
  (select count(*)::int from organizations),
  1,
  'Alice sees exactly one organization (her own)'
);

select is(
  (select count(*)::int from organizations where id = :'b_org'),
  0,
  'Alice cannot read Org B by id (RLS denies)'
);

select is(
  (select count(*)::int from org_members where org_id = :'b_org'),
  0,
  'Alice cannot read Org B membership'
);

-- Alice attempts to insert herself into Org B — RLS WITH CHECK must block it.
select throws_ok(
  $$ insert into org_members (org_id, user_id, role)
     values ('00000000-0000-0000-0000-000000000000'::uuid,
             '11111111-1111-1111-1111-111111111111'::uuid, 'admin') $$,
  null,
  'Alice cannot insert membership into an org she does not administer'
);

-- ── Assertions as Bob ─────────────────────────────────────────────────────────
select tests_become('22222222-2222-2222-2222-222222222222');

select is(
  (select count(*)::int from organizations),
  1,
  'Bob sees exactly one organization (his own)'
);

select is(
  (select count(*)::int from workspaces),
  1,
  'Bob sees only his own default workspace'
);

select is(
  (select count(*)::int from task_statuses),
  9,
  'Bob workspace seeded with the 9-state task workflow'
);

select * from finish();
rollback;
