-- The original `unique (org_id, email, status)` made revoke→re-invite and
-- repeated lifecycle transitions throw a raw duplicate-key error
-- (org_invitations_org_id_email_status_key). Replace it with the real intent:
-- at most one PENDING invitation per (org, email). Historical accepted/revoked/
-- expired rows may coexist freely.
alter table public.org_invitations
  drop constraint if exists org_invitations_org_id_email_status_key;

create unique index if not exists org_invitations_one_pending_per_email
  on public.org_invitations (org_id, lower(email))
  where status = 'pending';
