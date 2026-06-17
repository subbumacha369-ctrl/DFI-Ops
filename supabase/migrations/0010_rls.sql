-- ============================================================================
-- 0010_rls.sql
-- Row Level Security for every tenant table. The org_id / workspace_id predicate
-- is enforced in the database, so a forgotten WHERE clause in app code can never
-- leak data across tenants. This is the product's core safety property.
-- ============================================================================

-- Enable RLS everywhere.
alter table profiles                enable row level security;
alter table organizations           enable row level security;
alter table org_members             enable row level security;
alter table org_invitations         enable row level security;
alter table departments             enable row level security;
alter table teams                   enable row level security;
alter table team_members            enable row level security;
alter table workspaces              enable row level security;
alter table workspace_members       enable row level security;
alter table projects                enable row level security;
alter table task_statuses           enable row level security;
alter table tasks                   enable row level security;
alter table task_dependencies       enable row level security;
alter table tags                    enable row level security;
alter table task_tags               enable row level security;
alter table comments                enable row level security;
alter table comment_mentions        enable row level security;
alter table attachments             enable row level security;
alter table task_templates          enable row level security;
alter table captures                enable row level security;
alter table meetings                enable row level security;
alter table extractions             enable row level security;
alter table work_drafts             enable row level security;
alter table documents               enable row level security;
alter table doc_versions            enable row level security;
alter table doc_chunks              enable row level security;
alter table sop_runs                enable row level security;
alter table automation_rules        enable row level security;
alter table automation_actions      enable row level security;
alter table automation_run_logs     enable row level security;
alter table notifications           enable row level security;
alter table notification_preferences enable row level security;
alter table activity_events         enable row level security;
alter table report_definitions      enable row level security;
alter table report_runs             enable row level security;
alter table ai_conversations        enable row level security;
alter table ai_messages             enable row level security;
alter table audit_events            enable row level security;

-- ── profiles ──────────────────────────────────────────────────────────────────
create policy profiles_select_self_or_shared_org on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from org_members me
      join org_members them on them.org_id = me.org_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );
create policy profiles_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ── organizations ─────────────────────────────────────────────────────────────
create policy organizations_select_member on organizations for select
  using (is_org_member(id));
create policy organizations_update_admin on organizations for update
  using (is_org_admin(id)) with check (is_org_admin(id));
-- INSERT is performed only via create_organization() (SECURITY DEFINER).

-- ── org_members ───────────────────────────────────────────────────────────────
create policy org_members_select on org_members for select using (is_org_member(org_id));
create policy org_members_insert_admin on org_members for insert with check (is_org_admin(org_id));
create policy org_members_update_admin on org_members for update using (is_org_admin(org_id)) with check (is_org_admin(org_id));
create policy org_members_delete_admin on org_members for delete using (is_org_admin(org_id));

-- ── org_invitations ──────────────────────────────────────────────────────────
create policy org_invitations_admin_all on org_invitations for all
  using (is_org_admin(org_id)) with check (is_org_admin(org_id));

-- ── departments / teams ─────────────────────────────────────────────────────
create policy departments_select on departments for select using (is_org_member(org_id));
create policy departments_write_admin on departments for all
  using (is_org_admin(org_id)) with check (is_org_admin(org_id));

create policy teams_select on teams for select using (is_org_member(org_id));
create policy teams_write_admin on teams for all
  using (is_org_admin(org_id)) with check (is_org_admin(org_id));

create policy team_members_select on team_members for select
  using (exists (select 1 from teams t where t.id = team_id and is_org_member(t.org_id)));
create policy team_members_write_admin on team_members for all
  using (exists (select 1 from teams t where t.id = team_id and is_org_admin(t.org_id)))
  with check (exists (select 1 from teams t where t.id = team_id and is_org_admin(t.org_id)));

-- ── workspaces ────────────────────────────────────────────────────────────────
create policy workspaces_select on workspaces for select
  using (is_workspace_member(id) or is_org_admin(org_id));
create policy workspaces_insert_member on workspaces for insert
  with check (is_org_member(org_id) and created_by = auth.uid());
create policy workspaces_update_admin on workspaces for update
  using (is_workspace_admin(id)) with check (is_workspace_admin(id));
create policy workspaces_delete_admin on workspaces for delete
  using (is_workspace_admin(id));

create policy workspace_members_select on workspace_members for select
  using (is_workspace_member(workspace_id) or is_org_admin(org_id));
create policy workspace_members_write_admin on workspace_members for all
  using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));

-- ── projects ──────────────────────────────────────────────────────────────────
create policy projects_select on projects for select using (is_workspace_member(workspace_id));
create policy projects_write on projects for all
  using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ── task_statuses ─────────────────────────────────────────────────────────────
create policy task_statuses_select on task_statuses for select using (is_workspace_member(workspace_id));
create policy task_statuses_write_admin on task_statuses for all
  using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));

-- ── tasks ───────────────────────────────────────────────────────────────────
create policy tasks_all_member on tasks for all
  using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ── task children (gated through the parent task's workspace) ─────────────────
create policy task_dependencies_all on task_dependencies for all
  using (exists (select 1 from tasks t where t.id = task_id and is_workspace_member(t.workspace_id)))
  with check (exists (select 1 from tasks t where t.id = task_id and is_workspace_member(t.workspace_id)));

create policy task_tags_all on task_tags for all
  using (exists (select 1 from tasks t where t.id = task_id and is_workspace_member(t.workspace_id)))
  with check (exists (select 1 from tasks t where t.id = task_id and is_workspace_member(t.workspace_id)));

-- ── tags (org-level vocabulary) ───────────────────────────────────────────────
create policy tags_all on tags for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- ── comments / mentions ────────────────────────────────────────────────────────
create policy comments_select on comments for select using (is_workspace_member(workspace_id));
create policy comments_insert on comments for insert
  with check (is_workspace_member(workspace_id) and author_id = auth.uid());
create policy comments_update_own on comments for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete_own on comments for delete using (author_id = auth.uid());

create policy comment_mentions_all on comment_mentions for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- ── attachments ────────────────────────────────────────────────────────────────
create policy attachments_all on attachments for all
  using (is_org_member(org_id)) with check (is_org_member(org_id) and uploaded_by = auth.uid());

-- ── task_templates ───────────────────────────────────────────────────────────
create policy task_templates_select on task_templates for select using (is_workspace_member(workspace_id));
create policy task_templates_write on task_templates for all
  using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ── AI pipeline ─────────────────────────────────────────────────────────────────
create policy captures_all on captures for all
  using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy meetings_all on meetings for all
  using (exists (select 1 from captures c where c.id = capture_id and is_workspace_member(c.workspace_id)))
  with check (exists (select 1 from captures c where c.id = capture_id and is_workspace_member(c.workspace_id)));

create policy extractions_select on extractions for select
  using (exists (select 1 from captures c where c.id = capture_id and is_workspace_member(c.workspace_id)));
-- extractions are written by the service role (worker), so no member insert policy.

create policy work_drafts_all on work_drafts for all
  using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ── knowledge ─────────────────────────────────────────────────────────────────
create policy documents_all on documents for all
  using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy doc_versions_all on doc_versions for all
  using (exists (select 1 from documents d where d.id = document_id and is_workspace_member(d.workspace_id)))
  with check (exists (select 1 from documents d where d.id = document_id and is_workspace_member(d.workspace_id)));

create policy doc_chunks_select on doc_chunks for select
  using (exists (select 1 from documents d where d.id = document_id and is_workspace_member(d.workspace_id)));
-- chunks/embeddings are written by the service role (embedding worker).

create policy sop_runs_all on sop_runs for all
  using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ── automation ──────────────────────────────────────────────────────────────────
create policy automation_rules_select on automation_rules for select using (is_workspace_member(workspace_id));
create policy automation_rules_write_admin on automation_rules for all
  using (is_workspace_admin(workspace_id)) with check (is_workspace_admin(workspace_id));

create policy automation_actions_select on automation_actions for select
  using (exists (select 1 from automation_rules r where r.id = rule_id and is_workspace_member(r.workspace_id)));
create policy automation_actions_write_admin on automation_actions for all
  using (exists (select 1 from automation_rules r where r.id = rule_id and is_workspace_admin(r.workspace_id)))
  with check (exists (select 1 from automation_rules r where r.id = rule_id and is_workspace_admin(r.workspace_id)));

create policy automation_run_logs_select on automation_run_logs for select
  using (exists (select 1 from automation_rules r where r.id = rule_id and is_workspace_member(r.workspace_id)));

-- ── notifications (strictly per-user) ────────────────────────────────────────
create policy notifications_select_own on notifications for select using (user_id = auth.uid());
create policy notifications_update_own on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_prefs_all_own on notification_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── activity feed ──────────────────────────────────────────────────────────────
create policy activity_events_select on activity_events for select
  using (is_org_member(org_id) and (workspace_id is null or is_workspace_member(workspace_id)));
create policy activity_events_insert on activity_events for insert
  with check (is_org_member(org_id));

-- ── reporting ───────────────────────────────────────────────────────────────────
create policy report_definitions_all on report_definitions for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy report_runs_select on report_runs for select using (is_org_member(org_id));

-- ── AI conversations ────────────────────────────────────────────────────────────
create policy ai_conversations_all_own on ai_conversations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_messages_select_own on ai_messages for select
  using (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy ai_messages_insert_own on ai_messages for insert
  with check (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- ── audit (admins read; members may append; never mutate) ─────────────────────
create policy audit_events_select_admin on audit_events for select using (is_org_admin(org_id));
create policy audit_events_insert_member on audit_events for insert with check (is_org_member(org_id));
