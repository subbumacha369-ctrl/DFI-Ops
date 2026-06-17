-- ============================================================================
-- 0012_storage_realtime.sql
-- Private attachments bucket with tenant-scoped access, plus realtime wiring.
-- ============================================================================

-- Private bucket. Files are served only via short-lived signed URLs from the app.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Object keys are namespaced as: {org_id}/{workspace_id}/{entity}/{filename}.
-- Access requires org membership of the first path segment.
create policy "attachments read for org members"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and is_org_member( ((storage.foldername(name))[1])::uuid )
  );

create policy "attachments insert for org members"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and is_org_member( ((storage.foldername(name))[1])::uuid )
  );

create policy "attachments delete for org members"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and is_org_member( ((storage.foldername(name))[1])::uuid )
  );

-- ── Realtime: broadcast row changes for live UI ───────────────────────────────
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table work_drafts;
alter publication supabase_realtime add table activity_events;
