/**
 * Role-Based Access Control. The functional `app_role` (distinct from the
 * tenancy role that drives RLS) maps to a fixed set of permissions. This module
 * is the single source of truth, used by the frontend (UI visibility), the
 * backend (route guards), and the role/permission screens.
 */
import type { AppRole } from "@/types";

export type Permission =
  | "org.manage" | "org.settings"
  | "members.manage" | "members.view" | "members.invite"
  | "departments.manage" | "permissions.manage"
  | "projects.create" | "projects.manage" | "projects.assign"
  | "tasks.create" | "tasks.assign" | "tasks.assign_team" | "tasks.manage_own"
  | "reports.view_team" | "reports.view_all"
  | "team.manage" | "team.monitor"
  | "comments.create" | "documents.upload"
  | "read";

export const ALL_PERMISSIONS: Permission[] = [
  "org.manage", "org.settings", "members.manage", "members.view", "members.invite",
  "departments.manage", "permissions.manage", "projects.create", "projects.manage",
  "projects.assign", "tasks.create", "tasks.assign", "tasks.assign_team", "tasks.manage_own",
  "reports.view_team", "reports.view_all", "team.manage", "team.monitor",
  "comments.create", "documents.upload", "read",
];

const EMPLOYEE: Permission[] = ["read", "tasks.manage_own", "comments.create", "documents.upload", "members.view"];
const TEAM_LEAD: Permission[] = [...EMPLOYEE, "tasks.create", "tasks.assign_team", "team.monitor", "reports.view_team"];
const MANAGER: Permission[] = [
  ...TEAM_LEAD, "projects.create", "projects.assign", "tasks.assign", "team.manage", "members.invite",
];
const ORG_ADMIN: Permission[] = [
  ...MANAGER, "org.settings", "members.manage", "departments.manage", "permissions.manage",
  "projects.manage", "reports.view_all",
];

/** role → permission set. super_admin implicitly has everything via `can`. */
export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS, "org.manage"],
  org_admin: ORG_ADMIN,
  manager: MANAGER,
  team_lead: TEAM_LEAD,
  employee: EMPLOYEE,
  viewer: ["read", "members.view"],
};

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Organization Admin",
  manager: "Manager",
  team_lead: "Team Lead",
  employee: "Employee",
  viewer: "Viewer",
};

export const ROLE_ORDER: AppRole[] = ["super_admin", "org_admin", "manager", "team_lead", "employee", "viewer"];

export const PERMISSION_LABEL: Record<Permission, string> = {
  "org.manage": "Manage organizations (platform)",
  "org.settings": "Configure organization settings",
  "members.manage": "Manage members (add / remove / suspend)",
  "members.view": "View members & profiles",
  "members.invite": "Invite members",
  "departments.manage": "Manage departments & teams",
  "permissions.manage": "Manage roles & permissions",
  "projects.create": "Create projects",
  "projects.manage": "Manage all projects",
  "projects.assign": "Assign project teams",
  "tasks.create": "Create tasks",
  "tasks.assign": "Assign tasks (any)",
  "tasks.assign_team": "Assign tasks within team",
  "tasks.manage_own": "Manage own tasks",
  "reports.view_team": "View team reports",
  "reports.view_all": "View all reports",
  "team.manage": "Manage team members",
  "team.monitor": "Monitor team progress",
  "comments.create": "Comment",
  "documents.upload": "Upload documents",
  "read": "Read-only access",
};

/** Does this role grant the permission? super_admin always passes. */
export function can(role: AppRole | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

/** Roles a given actor is allowed to assign (cannot grant above your own level). */
export function assignableRoles(actor: AppRole | null | undefined): AppRole[] {
  if (actor === "super_admin") return ROLE_ORDER;
  if (actor === "org_admin") return ["manager", "team_lead", "employee", "viewer"];
  if (actor === "manager") return ["team_lead", "employee", "viewer"];
  return [];
}

// ───────────────────────────────────────────────────────────────────────────
// Sprint 2 — module × action matrix (the dynamic, editable permission system).
// The static `Permission` model above is kept for existing Sprint-1 screens.
// ───────────────────────────────────────────────────────────────────────────

export const ACTIONS = ["view", "create", "edit", "delete", "assign", "approve", "export"] as const;
export type ActionKey = (typeof ACTIONS)[number];

export const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "tasks", label: "Tasks" },
  { key: "projects", label: "Projects" },
  { key: "reports", label: "Reports" },
  { key: "knowledge", label: "Knowledge Base" },
  { key: "automation", label: "Automation" },
  { key: "members", label: "Members / Users" },
  { key: "departments", label: "Departments & Teams" },
  { key: "roles", label: "Roles" },
  { key: "permissions", label: "Permissions" },
  { key: "settings", label: "Settings" },
  { key: "notifications", label: "Notifications" },
] as const;
export type ModuleKey = (typeof MODULES)[number]["key"];

const A_ALL: ActionKey[] = [...ACTIONS];
const VIEW: ActionKey[] = ["view"];
const VIEW_EXPORT: ActionKey[] = ["view", "export"];
const CRUD_ASSIGN: ActionKey[] = ["view", "create", "edit", "delete", "assign"];

type ModuleMatrix = Partial<Record<ModuleKey, ActionKey[]>>;

/** Code defaults per role (used when no override row exists). */
export const DEFAULT_MODULE_MATRIX: Record<AppRole, ModuleMatrix> = {
  super_admin: Object.fromEntries(MODULES.map((m) => [m.key, A_ALL])) as ModuleMatrix,
  org_admin: Object.fromEntries(MODULES.map((m) => [m.key, A_ALL])) as ModuleMatrix,
  manager: {
    dashboard: VIEW_EXPORT, tasks: CRUD_ASSIGN, projects: CRUD_ASSIGN, reports: VIEW_EXPORT,
    knowledge: ["view", "create", "edit"], automation: VIEW, members: VIEW, departments: VIEW,
    roles: VIEW, notifications: VIEW,
  },
  team_lead: {
    dashboard: VIEW, tasks: CRUD_ASSIGN, projects: VIEW, reports: VIEW,
    knowledge: ["view", "create"], automation: VIEW, members: VIEW, notifications: VIEW,
  },
  employee: {
    dashboard: VIEW, tasks: ["view", "create", "edit"], projects: VIEW, knowledge: VIEW, notifications: VIEW,
  },
  viewer: {
    dashboard: VIEW, tasks: VIEW, projects: VIEW, reports: VIEW, knowledge: VIEW, notifications: VIEW,
  },
};

export type PermOverride = { app_role: AppRole; module: string; action: string; allowed: boolean };

/** Whether a role is granted (module, action), applying overrides over defaults. */
export function canModule(
  role: AppRole | null | undefined,
  module: ModuleKey,
  action: ActionKey,
  overrides: PermOverride[] = [],
): boolean {
  if (!role) return false;
  const ov = overrides.find((o) => o.app_role === role && o.module === module && o.action === action);
  if (ov) return ov.allowed;
  if (role === "super_admin") return true;
  return DEFAULT_MODULE_MATRIX[role]?.[module]?.includes(action) ?? false;
}

/** Compact label for a module's access level for a role (for the matrix grid). */
export function moduleAccessSummary(role: AppRole, module: ModuleKey, overrides: PermOverride[] = []): string {
  const granted = ACTIONS.filter((a) => canModule(role, module, a, overrides));
  if (granted.length === 0) return "No";
  if (granted.length === ACTIONS.length) return "Full";
  if (granted.length === 1 && granted[0] === "view") return "View";
  return granted.length + " actions";
}

// ── Feature visibility (nav items + dashboard widgets) ────────────────────────
export const FEATURES = [
  { key: "nav.dashboard", label: "Dashboard", group: "Navigation" },
  { key: "nav.activity", label: "Activity", group: "Navigation" },
  { key: "nav.reports", label: "Reports", group: "Navigation" },
  { key: "nav.members", label: "Members", group: "Navigation" },
  { key: "nav.organization", label: "Org structure", group: "Navigation" },
  { key: "nav.roles", label: "Roles & access", group: "Navigation" },
  { key: "nav.settings", label: "Settings", group: "Navigation" },
  { key: "nav.tasks", label: "Tasks", group: "Navigation" },
  { key: "nav.projects", label: "Projects", group: "Navigation" },
  { key: "nav.knowledge", label: "Knowledge", group: "Navigation" },
  { key: "nav.capture", label: "AI Capture", group: "Navigation" },
  { key: "nav.automations", label: "Automations", group: "Navigation" },
  { key: "widget.kpis", label: "KPI cards", group: "Dashboard widgets" },
  { key: "widget.trend", label: "Task trend chart", group: "Dashboard widgets" },
  { key: "widget.completion", label: "Completion donut", group: "Dashboard widgets" },
  { key: "widget.workload", label: "Workload chart", group: "Dashboard widgets" },
  { key: "widget.priority", label: "Priority breakdown", group: "Dashboard widgets" },
  { key: "widget.heatmap", label: "Team load heatmap", group: "Dashboard widgets" },
] as const;
export type FeatureKey = (typeof FEATURES)[number]["key"];

export type VisibilityOverride = { app_role: AppRole; feature_key: string; hidden: boolean };

/** A feature is visible unless an override hides it for the role. */
export function isFeatureVisible(role: AppRole | null | undefined, key: string, overrides: VisibilityOverride[] = []): boolean {
  if (!role) return true;
  const ov = overrides.find((o) => o.app_role === role && o.feature_key === key);
  return ov ? !ov.hidden : true;
}
