/**
 * Supabase database types — hand-authored to match supabase/migrations/*.sql.
 *
 * Covers the full Operations OS schema (tenancy, work management, AI pipeline,
 * knowledge base, automation, reporting, notifications, activity, audit).
 *
 * Once a local Supabase stack is running, regenerate the canonical file with:
 *   npm run db:types     (supabase gen types typescript --local)
 *
 * Relationships are intentionally left empty; the app uses explicit select
 * strings with `as` casts for embedded joins (see hooks/api routes).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRole = "owner" | "admin" | "member" | "guest";
export type WorkspaceRole = "admin" | "member" | "guest";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskStatusCategory = "open" | "in_progress" | "done" | "cancelled";
export type DependencyType = "blocks" | "relates" | "duplicates";
export type CaptureSourceType =
  | "meeting" | "voice" | "document" | "chat" | "project_update" | "nl";
export type CaptureStatus =
  | "received" | "transcribing" | "extracting" | "reviewed" | "failed";
export type WorkDraftStatus = "pending" | "accepted" | "edited" | "rejected";
export type DocumentType = "doc" | "sop" | "policy";
export type DocumentStatus = "draft" | "published" | "archived";
export type NotificationChannel = "in_app" | "email" | "whatsapp" | "sms" | "voice";
export type NotificationType =
  | "task_assigned" | "task_updated" | "task_completed" | "comment_added"
  | "mention" | "deadline_approaching" | "task_overdue" | "invitation"
  | "capture_processed" | "report_ready" | "automation";
export type AutomationTriggerType =
  | "task_created" | "task_status_changed" | "task_due_soon" | "task_overdue"
  | "comment_added" | "mentioned" | "capture_processed" | "schedule";
export type ReportType = "weekly" | "monthly" | "custom";
export type ReportStatus = "queued" | "running" | "completed" | "failed";
export type ActorType = "user" | "service" | "ai";
export type AppRole = "super_admin" | "org_admin" | "manager" | "team_lead" | "employee" | "viewer";
export type MemberStatus = "active" | "suspended" | "invited";

type Timestamps = { created_at: string; updated_at: string };

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string; email: string; full_name: string | null;
          avatar_url: string | null; phone: string | null; locale: string; timezone: string;
        } & Timestamps,
        { id: string; email: string; full_name?: string | null; avatar_url?: string | null; phone?: string | null; locale?: string; timezone?: string },
        Partial<{ email: string; full_name: string | null; avatar_url: string | null; phone: string | null; locale: string; timezone: string }>
      >;
      organizations: Table<
        {
          id: string; name: string; slug: string; plan: string; locale: string;
          timezone: string; settings: Json; status: string; created_by: string;
        } & Timestamps,
        { name: string; slug: string; timezone?: string; created_by: string },
        Partial<{ name: string; timezone: string; locale: string; settings: Json; status: string }>
      >;
      org_members: Table<
        {
          id: string; org_id: string; user_id: string; role: OrgRole; created_at: string;
          app_role: AppRole; status: MemberStatus; employee_id: string | null; designation: string | null;
          department_id: string | null; team_id: string | null; reporting_officer_id: string | null; join_date: string | null;
        },
        {
          org_id: string; user_id: string; role?: OrgRole; app_role?: AppRole; status?: MemberStatus;
          employee_id?: string | null; designation?: string | null; department_id?: string | null;
          team_id?: string | null; reporting_officer_id?: string | null; join_date?: string | null;
        },
        Partial<{
          role: OrgRole; app_role: AppRole; status: MemberStatus; employee_id: string | null;
          designation: string | null; department_id: string | null; team_id: string | null;
          reporting_officer_id: string | null; join_date: string | null;
        }>
      >;
      org_invitations: Table<
        {
          id: string; org_id: string; email: string; role: OrgRole; token: string;
          status: InvitationStatus; invited_by: string; expires_at: string; created_at: string;
        },
        { org_id: string; email: string; role?: OrgRole; invited_by: string },
        Partial<{ status: InvitationStatus; role: OrgRole }>
      >;
      departments: Table<
        { id: string; org_id: string; name: string; parent_id: string | null } & Timestamps,
        { org_id: string; name: string; parent_id?: string | null },
        Partial<{ name: string; parent_id: string | null }>
      >;
      teams: Table<
        { id: string; org_id: string; department_id: string | null; name: string } & Timestamps,
        { org_id: string; name: string; department_id?: string | null },
        Partial<{ name: string; department_id: string | null }>
      >;
      team_members: Table<
        { team_id: string; user_id: string; created_at: string },
        { team_id: string; user_id: string },
        Partial<{ team_id: string; user_id: string }>
      >;
      workspaces: Table<
        {
          id: string; org_id: string; name: string; icon: string | null;
          description: string | null; settings: Json; archived_at: string | null; created_by: string;
        } & Timestamps,
        { org_id: string; name: string; icon?: string | null; description?: string | null; created_by: string },
        Partial<{ name: string; icon: string | null; description: string | null; archived_at: string | null }>
      >;
      workspace_members: Table<
        { id: string; workspace_id: string; org_id: string; user_id: string; role: WorkspaceRole; created_at: string },
        { workspace_id: string; org_id: string; user_id: string; role?: WorkspaceRole },
        Partial<{ role: WorkspaceRole }>
      >;
      projects: Table<
        {
          id: string; org_id: string; workspace_id: string; name: string;
          description: string | null; status: string; start_date: string | null;
          due_date: string | null; owner_id: string | null; archived_at: string | null; created_by: string;
        } & Timestamps,
        { org_id: string; workspace_id: string; name: string; created_by: string; description?: string | null; status?: string; start_date?: string | null; due_date?: string | null; owner_id?: string | null },
        Partial<{ name: string; description: string | null; status: string; start_date: string | null; due_date: string | null; owner_id: string | null; archived_at: string | null }>
      >;
      milestones: Table<
        {
          id: string; org_id: string; project_id: string; name: string;
          description: string | null; due_date: string | null; status: string;
          position: number; completed_at: string | null; created_by: string;
        } & Timestamps,
        { org_id: string; project_id: string; name: string; created_by: string; description?: string | null; due_date?: string | null; status?: string; position?: number },
        Partial<{ name: string; description: string | null; due_date: string | null; status: string; position: number; completed_at: string | null }>
      >;
      project_members: Table<
        { id: string; org_id: string; project_id: string; user_id: string; role: string; created_at: string },
        { org_id: string; project_id: string; user_id: string; role?: string },
        Partial<{ role: string }>
      >;
      task_statuses: Table<
        {
          id: string; org_id: string; workspace_id: string; name: string;
          category: TaskStatusCategory; position: number; color: string;
          is_default: boolean; is_terminal: boolean; created_at: string;
        },
        { org_id: string; workspace_id: string; name: string; category: TaskStatusCategory; position?: number; color?: string; is_default?: boolean; is_terminal?: boolean },
        Partial<{ name: string; category: TaskStatusCategory; position: number; color: string; is_default: boolean; is_terminal: boolean }>
      >;
      tasks: Table<
        {
          id: string; org_id: string; workspace_id: string; project_id: string | null;
          parent_task_id: string | null; department_id: string | null; status_id: string;
          milestone_id: string | null; title: string; description: string | null;
          priority: TaskPriority; due_date: string | null; start_date: string | null;
          assigned_to: string | null; assigned_by: string | null; created_by: string;
          capture_id: string | null; source_confidence: number | null;
          recurrence_rule: string | null; template_id: string | null; position: number;
          completed_at: string | null; verified_at: string | null; verified_by: string | null;
          archived_at: string | null;
        } & Timestamps,
        {
          org_id: string; workspace_id: string; status_id: string; title: string; created_by: string;
          project_id?: string | null; parent_task_id?: string | null; department_id?: string | null;
          milestone_id?: string | null; description?: string | null; priority?: TaskPriority;
          due_date?: string | null; start_date?: string | null; assigned_to?: string | null;
          assigned_by?: string | null; capture_id?: string | null; source_confidence?: number | null;
          recurrence_rule?: string | null; template_id?: string | null; position?: number;
        },
        Partial<{
          status_id: string; title: string; description: string | null; priority: TaskPriority;
          due_date: string | null; start_date: string | null; assigned_to: string | null;
          assigned_by: string | null; project_id: string | null; milestone_id: string | null;
          department_id: string | null; recurrence_rule: string | null; position: number;
          completed_at: string | null; verified_at: string | null; verified_by: string | null;
          archived_at: string | null;
        }>
      >;
      task_dependencies: Table<
        { id: string; org_id: string; task_id: string; depends_on_id: string; type: DependencyType; created_at: string },
        { org_id: string; task_id: string; depends_on_id: string; type?: DependencyType },
        Partial<{ type: DependencyType }>
      >;
      tags: Table<
        { id: string; org_id: string; name: string; color: string; created_at: string },
        { org_id: string; name: string; color?: string },
        Partial<{ name: string; color: string }>
      >;
      task_tags: Table<
        { task_id: string; tag_id: string; org_id: string },
        { task_id: string; tag_id: string; org_id: string },
        Partial<{ task_id: string; tag_id: string }>
      >;
      comments: Table<
        {
          id: string; org_id: string; workspace_id: string; entity_type: string;
          entity_id: string; author_id: string; body: string; parent_comment_id: string | null;
        } & Timestamps,
        { org_id: string; workspace_id: string; entity_type: string; entity_id: string; author_id: string; body: string; parent_comment_id?: string | null },
        Partial<{ body: string }>
      >;
      comment_mentions: Table<
        { comment_id: string; mentioned_user_id: string; org_id: string },
        { comment_id: string; mentioned_user_id: string; org_id: string },
        Partial<{ mentioned_user_id: string }>
      >;
      attachments: Table<
        {
          id: string; org_id: string; workspace_id: string | null; entity_type: string;
          entity_id: string; storage_key: string; filename: string; mime_type: string | null;
          size_bytes: number | null; scanned_status: string; uploaded_by: string; created_at: string;
        },
        { org_id: string; entity_type: string; entity_id: string; storage_key: string; filename: string; uploaded_by: string; workspace_id?: string | null; mime_type?: string | null; size_bytes?: number | null; scanned_status?: string },
        Partial<{ scanned_status: string; filename: string }>
      >;
      task_templates: Table<
        { id: string; org_id: string; workspace_id: string; name: string; definition: Json; created_by: string } & Timestamps,
        { org_id: string; workspace_id: string; name: string; created_by: string; definition?: Json },
        Partial<{ name: string; definition: Json }>
      >;
      captures: Table<
        {
          id: string; org_id: string; workspace_id: string; source_type: CaptureSourceType;
          title: string | null; raw_storage_key: string | null; raw_text: string | null;
          status: CaptureStatus; error: string | null; created_by: string;
        } & Timestamps,
        { org_id: string; workspace_id: string; source_type: CaptureSourceType; created_by: string; title?: string | null; raw_storage_key?: string | null; raw_text?: string | null; status?: CaptureStatus },
        Partial<{ title: string | null; raw_text: string | null; status: CaptureStatus; error: string | null }>
      >;
      meetings: Table<
        {
          id: string; org_id: string; capture_id: string; title: string;
          occurred_at: string | null; participants: Json; summary: string | null; decisions: Json; created_at: string;
        },
        { org_id: string; capture_id: string; title: string; occurred_at?: string | null; participants?: Json; summary?: string | null; decisions?: Json },
        Partial<{ title: string; summary: string | null; decisions: Json; participants: Json }>
      >;
      extractions: Table<
        { id: string; org_id: string; capture_id: string; model: string; summary: string | null; output: Json; token_cost: number | null; created_at: string },
        { org_id: string; capture_id: string; model: string; summary?: string | null; output?: Json; token_cost?: number | null },
        Partial<{ summary: string | null; output: Json }>
      >;
      work_drafts: Table<
        {
          id: string; org_id: string; workspace_id: string; extraction_id: string; title: string;
          description: string | null; suggested_assignee_id: string | null; suggested_due_date: string | null;
          suggested_project_id: string | null; priority: TaskPriority; confidence: number;
          status: WorkDraftStatus; committed_task_id: string | null;
        } & Timestamps,
        {
          org_id: string; workspace_id: string; extraction_id: string; title: string;
          description?: string | null; suggested_assignee_id?: string | null; suggested_due_date?: string | null;
          suggested_project_id?: string | null; priority?: TaskPriority; confidence?: number; status?: WorkDraftStatus;
        },
        Partial<{ title: string; description: string | null; suggested_assignee_id: string | null; suggested_due_date: string | null; suggested_project_id: string | null; priority: TaskPriority; status: WorkDraftStatus; committed_task_id: string | null }>
      >;
      documents: Table<
        {
          id: string; org_id: string; workspace_id: string; type: DocumentType; title: string;
          status: DocumentStatus; current_version_id: string | null; category_id: string | null; created_by: string;
        } & Timestamps,
        { org_id: string; workspace_id: string; title: string; created_by: string; type?: DocumentType; status?: DocumentStatus; category_id?: string | null; current_version_id?: string | null },
        Partial<{ title: string; type: DocumentType; status: DocumentStatus; current_version_id: string | null; category_id: string | null }>
      >;
      doc_versions: Table<
        { id: string; org_id: string; document_id: string; body: string; version_no: number; author_id: string; created_at: string },
        { org_id: string; document_id: string; body: string; version_no: number; author_id: string },
        Partial<{ body: string }>
      >;
      doc_chunks: Table<
        { id: string; org_id: string; document_id: string; version_id: string; chunk_index: number; chunk_text: string; embedding: string | null; created_at: string },
        { org_id: string; document_id: string; version_id: string; chunk_index: number; chunk_text: string; embedding?: string | null },
        Partial<{ chunk_text: string; embedding: string | null }>
      >;
      sop_runs: Table<
        { id: string; org_id: string; workspace_id: string; document_id: string; started_by: string; generated_task_ids: Json; created_at: string },
        { org_id: string; workspace_id: string; document_id: string; started_by: string; generated_task_ids?: Json },
        Partial<{ generated_task_ids: Json }>
      >;
      document_categories: Table<
        { id: string; org_id: string; workspace_id: string; name: string; color: string; created_at: string },
        { org_id: string; workspace_id: string; name: string; color?: string },
        Partial<{ name: string; color: string }>
      >;
      automation_rules: Table<
        {
          id: string; org_id: string; workspace_id: string; name: string;
          trigger_type: AutomationTriggerType; trigger: Json; conditions: Json; enabled: boolean; created_by: string;
        } & Timestamps,
        { org_id: string; workspace_id: string; name: string; trigger_type: AutomationTriggerType; created_by: string; trigger?: Json; conditions?: Json; enabled?: boolean },
        Partial<{ name: string; trigger_type: AutomationTriggerType; trigger: Json; conditions: Json; enabled: boolean }>
      >;
      automation_actions: Table<
        { id: string; org_id: string; rule_id: string; position: number; action_type: string; params: Json; created_at: string },
        { org_id: string; rule_id: string; action_type: string; position?: number; params?: Json },
        Partial<{ position: number; action_type: string; params: Json }>
      >;
      automation_run_logs: Table<
        { id: string; org_id: string; rule_id: string; context: Json; result: string; error: string | null; fired_at: string },
        { org_id: string; rule_id: string; result: string; context?: Json; error?: string | null },
        Partial<{ result: string; error: string | null }>
      >;
      notifications: Table<
        {
          id: string; org_id: string; user_id: string; type: NotificationType; channel: NotificationChannel;
          title: string; body: string | null; payload: Json; read_at: string | null; created_at: string;
        },
        { org_id: string; user_id: string; type: NotificationType; title: string; channel?: NotificationChannel; body?: string | null; payload?: Json },
        Partial<{ read_at: string | null }>
      >;
      notification_preferences: Table<
        { user_id: string; org_id: string; type: NotificationType; channel: NotificationChannel; enabled: boolean; frequency: string },
        { user_id: string; org_id: string; type: NotificationType; channel: NotificationChannel; enabled?: boolean; frequency?: string },
        Partial<{ enabled: boolean; frequency: string }>
      >;
      activity_events: Table<
        {
          id: string; org_id: string; workspace_id: string | null; actor_id: string | null;
          actor_type: ActorType; verb: string; object_type: string; object_id: string; metadata: Json; created_at: string;
        },
        { org_id: string; verb: string; object_type: string; object_id: string; workspace_id?: string | null; actor_id?: string | null; actor_type?: ActorType; metadata?: Json },
        Partial<{ metadata: Json }>
      >;
      report_definitions: Table<
        {
          id: string; org_id: string; workspace_id: string | null; name: string; type: ReportType;
          scope: Json; schedule: string | null; recipients: Json; created_by: string;
        } & Timestamps,
        { org_id: string; name: string; type: ReportType; created_by: string; workspace_id?: string | null; scope?: Json; schedule?: string | null; recipients?: Json },
        Partial<{ name: string; type: ReportType; scope: Json; schedule: string | null; recipients: Json }>
      >;
      report_runs: Table<
        {
          id: string; org_id: string; definition_id: string; period_start: string | null; period_end: string | null;
          status: ReportStatus; metrics: Json; ai_summary: string | null; output_key: string | null;
          error: string | null; generated_at: string | null; created_at: string;
        },
        { org_id: string; definition_id: string; period_start?: string | null; period_end?: string | null; status?: ReportStatus; metrics?: Json; ai_summary?: string | null; output_key?: string | null; generated_at?: string | null },
        Partial<{ status: ReportStatus; metrics: Json; ai_summary: string | null; output_key: string | null; error: string | null; generated_at: string | null }>
      >;
      ai_conversations: Table<
        { id: string; org_id: string; workspace_id: string | null; user_id: string; title: string | null } & Timestamps,
        { org_id: string; user_id: string; workspace_id?: string | null; title?: string | null },
        Partial<{ title: string | null }>
      >;
      ai_messages: Table<
        { id: string; org_id: string; conversation_id: string; role: string; content: string; citations: Json; created_at: string },
        { org_id: string; conversation_id: string; role: string; content: string; citations?: Json },
        Partial<{ content: string; citations: Json }>
      >;
      role_permissions: Table<
        { id: string; org_id: string; app_role: AppRole; module: string; action: string; allowed: boolean; updated_by: string | null; updated_at: string },
        { org_id: string; app_role: AppRole; module: string; action: string; allowed?: boolean; updated_by?: string | null },
        Partial<{ allowed: boolean; updated_by: string | null }>
      >;
      feature_visibility: Table<
        { id: string; org_id: string; app_role: AppRole; feature_key: string; hidden: boolean; updated_by: string | null; updated_at: string },
        { org_id: string; app_role: AppRole; feature_key: string; hidden?: boolean; updated_by?: string | null },
        Partial<{ hidden: boolean; updated_by: string | null }>
      >;
      audit_events: Table<
        {
          id: string; org_id: string; actor_id: string | null; actor_type: ActorType; action: string;
          entity_type: string; entity_id: string | null; before: Json | null; after: Json | null; ip: string | null; created_at: string;
        },
        { org_id: string; action: string; entity_type: string; actor_id?: string | null; actor_type?: ActorType; entity_id?: string | null; before?: Json | null; after?: Json | null },
        Partial<{ never: never }>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { p_name: string; p_timezone?: string };
        Returns: { org_id: string; org_slug: string; workspace_id: string }[];
      };
      create_workspace: {
        Args: { p_org_id: string; p_name: string; p_icon?: string | null; p_description?: string | null };
        Returns: string;
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: { org_id: string; org_slug: string }[];
      };
      seed_default_task_statuses: {
        Args: { p_org_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      is_org_member: { Args: { p_org_id: string }; Returns: boolean };
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean };
      org_role_of: { Args: { p_org_id: string }; Returns: OrgRole };
      is_workspace_member: { Args: { p_workspace_id: string }; Returns: boolean };
      is_workspace_admin: { Args: { p_workspace_id: string }; Returns: boolean };
      app_role_of: { Args: { p_org_id: string }; Returns: AppRole };
      is_org_manager: { Args: { p_org_id: string }; Returns: boolean };
      slugify: { Args: { p_text: string }; Returns: string };
    };
    Enums: {
      org_role: OrgRole;
      workspace_role: WorkspaceRole;
      invitation_status: InvitationStatus;
      task_priority: TaskPriority;
      task_status_category: TaskStatusCategory;
      dependency_type: DependencyType;
      capture_source_type: CaptureSourceType;
      capture_status: CaptureStatus;
      work_draft_status: WorkDraftStatus;
      document_type: DocumentType;
      document_status: DocumentStatus;
      notification_channel: NotificationChannel;
      notification_type: NotificationType;
      automation_trigger_type: AutomationTriggerType;
      report_type: ReportType;
      report_status: ReportStatus;
      actor_type: ActorType;
      app_role: AppRole;
    };
  };
}
