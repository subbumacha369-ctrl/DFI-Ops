import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type Organization = Tables["organizations"]["Row"];
export type OrgMember = Tables["org_members"]["Row"];
export type OrgInvitation = Tables["org_invitations"]["Row"];
export type Workspace = Tables["workspaces"]["Row"];
export type WorkspaceMember = Tables["workspace_members"]["Row"];
export type Department = Tables["departments"]["Row"];
export type Team = Tables["teams"]["Row"];

export type Project = Tables["projects"]["Row"];
export type Milestone = Tables["milestones"]["Row"];
export type ProjectMember = Tables["project_members"]["Row"];
export type TaskStatus = Tables["task_statuses"]["Row"];
export type Task = Tables["tasks"]["Row"];
export type TaskDependency = Tables["task_dependencies"]["Row"];
export type Tag = Tables["tags"]["Row"];
export type Comment = Tables["comments"]["Row"];
export type Attachment = Tables["attachments"]["Row"];
export type TaskTemplate = Tables["task_templates"]["Row"];

export type Capture = Tables["captures"]["Row"];
export type Meeting = Tables["meetings"]["Row"];
export type Extraction = Tables["extractions"]["Row"];
export type WorkDraft = Tables["work_drafts"]["Row"];

export type Document = Tables["documents"]["Row"];
export type DocVersion = Tables["doc_versions"]["Row"];
export type DocumentCategory = Tables["document_categories"]["Row"];

export type AutomationRule = Tables["automation_rules"]["Row"];
export type AutomationAction = Tables["automation_actions"]["Row"];
export type AutomationRunLog = Tables["automation_run_logs"]["Row"];

export type Notification = Tables["notifications"]["Row"];
export type NotificationPreference = Tables["notification_preferences"]["Row"];
export type ActivityEvent = Tables["activity_events"]["Row"];
export type ReportDefinition = Tables["report_definitions"]["Row"];
export type ReportRun = Tables["report_runs"]["Row"];
export type AiConversation = Tables["ai_conversations"]["Row"];
export type AiMessage = Tables["ai_messages"]["Row"];
export type AuditEvent = Tables["audit_events"]["Row"];

export type OrgRole = Database["public"]["Enums"]["org_role"];
export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type MemberStatus = "active" | "suspended" | "invited";
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskStatusCategory = Database["public"]["Enums"]["task_status_category"];
export type DependencyType = Database["public"]["Enums"]["dependency_type"];
export type CaptureSourceType = Database["public"]["Enums"]["capture_source_type"];
export type CaptureStatus = Database["public"]["Enums"]["capture_status"];
export type WorkDraftStatus = Database["public"]["Enums"]["work_draft_status"];
export type DocumentType = Database["public"]["Enums"]["document_type"];
export type DocumentStatus = Database["public"]["Enums"]["document_status"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type AutomationTriggerType = Database["public"]["Enums"]["automation_trigger_type"];
export type ReportType = Database["public"]["Enums"]["report_type"];

/** An org joined with the current user's role in it (used by the org switcher). */
export type OrgWithRole = Organization & { role: OrgRole };

/** A member row joined with their profile (used by the members table). */
export type MemberWithProfile = OrgMember & {
  profile: Pick<Profile, "id" | "email" | "full_name" | "avatar_url">;
};

/** A directory row: membership + profile + resolved reporting officer / dept / team. */
export type MemberDirectoryRow = OrgMember & {
  profile: Pick<Profile, "id" | "email" | "full_name" | "avatar_url" | "phone"> | null;
  reportingOfficer: Pick<Profile, "id" | "full_name" | "email"> | null;
  department: Pick<Department, "id" | "name"> | null;
  team: Pick<Team, "id" | "name"> | null;
};

/** Minimal person shape used across assignee/author UI. */
export type PersonLite = Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;

/** A task joined with its status, assignee, and project for board/list rendering. */
export type TaskWithRelations = Task & {
  status: Pick<TaskStatus, "id" | "name" | "category" | "color"> | null;
  assignee: PersonLite | null;
  project: Pick<Project, "id" | "name"> | null;
};

/** A comment joined with its author (and resolved mentions) for threads. */
export type CommentWithAuthor = Comment & {
  author: PersonLite | null;
};

/** A project joined with derived progress counts. */
export type ProjectWithStats = Project & {
  owner: PersonLite | null;
  taskCount: number;
  doneCount: number;
};
