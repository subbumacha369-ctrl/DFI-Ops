/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed / demo data for local review mode. Built once per server process and
 * stored on globalThis so mutations made during a review session persist until
 * the dev server restarts.
 */
type Row = Record<string, any>;
export type DemoStore = Record<string, Row[]>;

const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() - offsetDays * day).toISOString();
const date = (offsetDays: number) => new Date(Date.now() - offsetDays * day).toISOString().slice(0, 10);

const ORG = "o_demo";
const WS = "w_ops";
const U1 = "u_demo";   // Demo Manager (the reviewer)
const U2 = "u_alex";   // Alex Rivera
const U3 = "u_sam";    // Sam Patel

// Status ids
const S = {
  created: "st_created", accepted: "st_accepted", progress: "st_progress",
  hold: "st_hold", completed: "st_completed", verified: "st_verified",
  closed: "st_closed", rejected: "st_rejected", cancelled: "st_cancelled",
};

function buildStore(): DemoStore {
  const profiles: Row[] = [
    { id: U1, email: "demo@opsos.local", full_name: "Demo Manager", avatar_url: null, phone: "+1 555 0100", locale: "en", timezone: "UTC", created_at: iso(40), updated_at: iso(1) },
    { id: U2, email: "alex@opsos.local", full_name: "Alex Rivera", avatar_url: null, phone: "+1 555 0101", locale: "en", timezone: "UTC", created_at: iso(40), updated_at: iso(1) },
    { id: U3, email: "sam@opsos.local", full_name: "Sam Patel", avatar_url: null, phone: "+1 555 0102", locale: "en", timezone: "UTC", created_at: iso(40), updated_at: iso(1) },
    { id: "u_jordan", email: "jordan@opsos.local", full_name: "Jordan Kim", avatar_url: null, phone: "+1 555 0103", locale: "en", timezone: "UTC", created_at: iso(25), updated_at: iso(1) },
    { id: "u_riya", email: "riya@opsos.local", full_name: "Riya Shah", avatar_url: null, phone: "+1 555 0104", locale: "en", timezone: "UTC", created_at: iso(22), updated_at: iso(1) },
  ];

  const organizations: Row[] = [
    { id: ORG, name: "Demo Operations Co", slug: "demo-co", plan: "pro", locale: "en", timezone: "UTC", settings: {}, status: "active", created_by: U1, created_at: iso(40), updated_at: iso(2) },
  ];

  const departments: Row[] = [
    { id: "dep_ops", org_id: ORG, name: "Operations", parent_id: null, created_at: iso(40), updated_at: iso(40) },
    { id: "dep_eng", org_id: ORG, name: "Engineering", parent_id: null, created_at: iso(40), updated_at: iso(40) },
  ];
  const teams: Row[] = [
    { id: "team_dispatch", org_id: ORG, department_id: "dep_ops", name: "Dispatch", created_at: iso(38), updated_at: iso(38) },
    { id: "team_platform", org_id: ORG, department_id: "dep_eng", name: "Platform", created_at: iso(38), updated_at: iso(38) },
  ];

  // Hierarchy: Demo Manager (CEO/super_admin) → Alex (manager) → Sam, Jordan;
  //            Demo Manager → Riya (team_lead).
  const mkMember = (id: string, user: string, role: string, app_role: string, opts: Partial<Row> = {}) =>
    ({ id, org_id: ORG, user_id: user, role, app_role, status: opts.status ?? "active",
       employee_id: opts.employee_id ?? null, designation: opts.designation ?? null,
       department_id: opts.department_id ?? null, team_id: opts.team_id ?? null,
       reporting_officer_id: opts.reporting_officer_id ?? null, join_date: opts.join_date ?? null,
       created_at: opts.created_at ?? iso(38) });
  const org_members: Row[] = [
    mkMember("om1", U1, "owner", "super_admin", { employee_id: "EMP-001", designation: "Chief Executive Officer", department_id: "dep_ops", join_date: date(400) }),
    mkMember("om2", U2, "admin", "manager", { employee_id: "EMP-002", designation: "Operations Manager", department_id: "dep_ops", team_id: "team_dispatch", reporting_officer_id: U1, join_date: date(360) }),
    mkMember("om3", U3, "member", "employee", { employee_id: "EMP-003", designation: "Field Coordinator", department_id: "dep_ops", team_id: "team_dispatch", reporting_officer_id: U2, join_date: date(300) }),
    mkMember("om4", "u_jordan", "member", "employee", { employee_id: "EMP-004", designation: "Dispatch Analyst", department_id: "dep_ops", team_id: "team_dispatch", reporting_officer_id: U2, join_date: date(120) }),
    mkMember("om5", "u_riya", "member", "team_lead", { employee_id: "EMP-005", designation: "Platform Team Lead", department_id: "dep_eng", team_id: "team_platform", reporting_officer_id: U1, status: "active", join_date: date(200) }),
  ];

  const org_invitations: Row[] = [
    { id: "inv1", org_id: ORG, email: "jordan@partner.com", role: "member", token: "demo-token-1", status: "pending", invited_by: U1, expires_at: iso(-10), created_at: iso(3) },
  ];

  const workspaces: Row[] = [
    { id: WS, org_id: ORG, name: "Field Operations", icon: "🛠️", description: "Day-to-day field operations and dispatch.", settings: {}, archived_at: null, created_by: U1, created_at: iso(38), updated_at: iso(2) },
    { id: "w_marketing", org_id: ORG, name: "Marketing", icon: "📣", description: "Campaigns and content.", settings: {}, archived_at: null, created_by: U1, created_at: iso(20), updated_at: iso(5) },
  ];

  const workspace_members: Row[] = [
    { id: "wm1", workspace_id: WS, org_id: ORG, user_id: U1, role: "admin", created_at: iso(38) },
    { id: "wm2", workspace_id: WS, org_id: ORG, user_id: U2, role: "member", created_at: iso(36) },
    { id: "wm3", workspace_id: WS, org_id: ORG, user_id: U3, role: "member", created_at: iso(30) },
    { id: "wm4", workspace_id: "w_marketing", org_id: ORG, user_id: U1, role: "admin", created_at: iso(20) },
  ];

  const mkStatus = (id: string, name: string, category: string, position: number, color: string, is_default = false, is_terminal = false, workspace = WS) =>
    ({ id: workspace === WS ? id : `${id}_mk`, org_id: ORG, workspace_id: workspace, name, category, position, color, is_default, is_terminal, created_at: iso(38) });

  const task_statuses: Row[] = [
    mkStatus(S.created, "Created", "open", 0, "#94a3b8", true),
    mkStatus(S.accepted, "Accepted", "open", 1, "#38bdf8"),
    mkStatus(S.progress, "In Progress", "in_progress", 2, "#6366f1"),
    mkStatus(S.hold, "On Hold", "in_progress", 3, "#f59e0b"),
    mkStatus(S.completed, "Completed", "done", 4, "#22c55e"),
    mkStatus(S.verified, "Verified", "done", 5, "#16a34a"),
    mkStatus(S.closed, "Closed", "done", 6, "#0f766e", false, true),
    mkStatus(S.rejected, "Rejected", "cancelled", 7, "#ef4444", false, true),
    mkStatus(S.cancelled, "Cancelled", "cancelled", 8, "#71717a", false, true),
    // Marketing workspace default status so its board isn't empty-broken
    mkStatus(S.created, "Backlog", "open", 0, "#94a3b8", true, false, "w_marketing"),
  ];

  const projects: Row[] = [
    { id: "p_launch", org_id: ORG, workspace_id: WS, name: "Q3 Service Launch", description: "Roll out the new field-service offering across regions.", status: "active", start_date: date(20), due_date: date(-25), owner_id: U1, archived_at: null, created_by: U1, created_at: iso(20), updated_at: iso(2) },
    { id: "p_migration", org_id: ORG, workspace_id: WS, name: "Depot Migration", description: "Consolidate two depots into the new hub.", status: "active", start_date: date(15), due_date: date(-10), owner_id: U2, archived_at: null, created_by: U2, created_at: iso(15), updated_at: iso(3) },
  ];

  const milestones: Row[] = [
    { id: "ms1", org_id: ORG, project_id: "p_launch", name: "Pilot region live", description: null, due_date: date(5), status: "completed", position: 0, completed_at: iso(4), created_by: U1, created_at: iso(18), updated_at: iso(4) },
    { id: "ms2", org_id: ORG, project_id: "p_launch", name: "All regions live", description: null, due_date: date(-20), status: "open", position: 1, completed_at: null, created_by: U1, created_at: iso(18), updated_at: iso(18) },
    { id: "ms3", org_id: ORG, project_id: "p_migration", name: "Inventory moved", description: null, due_date: date(-5), status: "open", position: 0, completed_at: null, created_by: U2, created_at: iso(15), updated_at: iso(15) },
  ];

  const project_members: Row[] = [
    { id: "pm1", org_id: ORG, project_id: "p_launch", user_id: U1, role: "lead", created_at: iso(20) },
    { id: "pm2", org_id: ORG, project_id: "p_launch", user_id: U2, role: "member", created_at: iso(19) },
    { id: "pm3", org_id: ORG, project_id: "p_migration", user_id: U2, role: "lead", created_at: iso(15) },
    { id: "pm4", org_id: ORG, project_id: "p_migration", user_id: U3, role: "member", created_at: iso(14) },
  ];

  // Tasks tuned for charts: spread created_at, some completed, two overdue.
  const mkTask = (id: string, title: string, status: string, priority: string, assignee: string | null, createdDaysAgo: number, opts: Partial<Row> = {}) =>
    ({
      id, org_id: ORG, workspace_id: WS, project_id: opts.project_id ?? null, parent_task_id: opts.parent_task_id ?? null,
      department_id: null, status_id: status, milestone_id: opts.milestone_id ?? null, title, description: opts.description ?? null,
      priority, due_date: opts.due_date ?? null, start_date: null, assigned_to: assignee, assigned_by: assignee ? U1 : null,
      created_by: U1, capture_id: null, source_confidence: opts.source_confidence ?? null, recurrence_rule: opts.recurrence_rule ?? null,
      template_id: null, position: 0, completed_at: opts.completed_at ?? null, verified_at: null, verified_by: null,
      archived_at: null, created_at: iso(createdDaysAgo), updated_at: iso(Math.max(0, createdDaysAgo - 1)),
    });

  const tasks: Row[] = [
    mkTask("t1", "Confirm pilot-region staffing", S.completed, "high", U2, 12, { project_id: "p_launch", completed_at: iso(8) }),
    mkTask("t2", "Order replacement vehicles", S.completed, "medium", U3, 11, { project_id: "p_launch", completed_at: iso(7) }),
    mkTask("t3", "Draft regional rollout plan", S.verified, "high", U1, 10, { project_id: "p_launch", completed_at: iso(6) }),
    mkTask("t4", "Set up dispatch dashboards", S.progress, "high", U2, 9, { project_id: "p_launch", due_date: iso(-3) }),
    mkTask("t5", "Negotiate depot lease", S.progress, "critical", U1, 8, { project_id: "p_migration", due_date: iso(-1) }),
    mkTask("t6", "Inventory audit at Depot A", S.completed, "medium", U3, 8, { project_id: "p_migration", completed_at: iso(4) }),
    mkTask("t7", "Update safety SOP for new hub", S.accepted, "medium", U2, 6, { project_id: "p_migration" }),
    mkTask("t8", "Overdue: submit compliance forms", S.progress, "critical", U3, 7, { due_date: iso(2), description: "Regulatory filing past due." }),
    mkTask("t9", "Overdue: vendor contract review", S.hold, "high", U2, 9, { due_date: iso(3) }),
    mkTask("t10", "Plan customer comms", S.created, "low", null, 4, { project_id: "p_launch", due_date: iso(-6) }),
    mkTask("t11", "Weekly depot inspection", S.created, "medium", U3, 3, { recurrence_rule: "FREQ=WEEKLY;INTERVAL=1", due_date: iso(-2) }),
    mkTask("t12", "Hire 2 field technicians", S.accepted, "high", U1, 5, { project_id: "p_migration", due_date: iso(-14) }),
    mkTask("t13", "Archive legacy routes", S.completed, "low", U2, 6, { completed_at: iso(2) }),
    mkTask("t14", "Review Q2 incident reports", S.verified, "medium", U1, 13, { completed_at: iso(9) }),
    // a subtask of t4
    mkTask("t4a", "Wire up live map widget", S.progress, "medium", U2, 5, { parent_task_id: "t4" }),
  ];

  const tags: Row[] = [
    { id: "tag1", org_id: ORG, name: "urgent", color: "#ef4444", created_at: iso(20) },
    { id: "tag2", org_id: ORG, name: "field", color: "#0f766e", created_at: iso(20) },
  ];

  const comments: Row[] = [
    { id: "c1", org_id: ORG, workspace_id: WS, entity_type: "task", entity_id: "t5", author_id: U2, body: "Landlord wants a 3-year term — pushing back to 2.", parent_comment_id: null, created_at: iso(2), updated_at: iso(2) },
    { id: "c2", org_id: ORG, workspace_id: WS, entity_type: "task", entity_id: "t5", author_id: U1, body: "Agreed, hold at 2 years. @Alex Rivera can you redline?", parent_comment_id: null, created_at: iso(1), updated_at: iso(1) },
  ];

  const task_dependencies: Row[] = [
    { id: "dep1", org_id: ORG, task_id: "t4", depends_on_id: "t1", type: "blocks", created_at: iso(7) },
  ];

  const documents: Row[] = [
    { id: "doc1", org_id: ORG, workspace_id: WS, type: "sop", title: "Field Incident Response SOP", status: "published", current_version_id: "dv1", category_id: null, created_by: U1, created_at: iso(25), updated_at: iso(3) },
    { id: "doc2", org_id: ORG, workspace_id: WS, type: "policy", title: "Vehicle Safety Policy", status: "published", current_version_id: "dv2", category_id: null, created_by: U2, created_at: iso(22), updated_at: iso(6) },
    { id: "doc3", org_id: ORG, workspace_id: WS, type: "doc", title: "Depot Migration Runbook", status: "draft", current_version_id: "dv3", category_id: null, created_by: U2, created_at: iso(10), updated_at: iso(2) },
  ];
  const doc_versions: Row[] = [
    { id: "dv1", org_id: ORG, document_id: "doc1", version_no: 1, author_id: U1, created_at: iso(25), body: "# Field Incident Response\n\n1. Secure the area.\n2. Report to dispatch within 15 minutes.\n3. Complete the incident form.\n4. Notify the safety officer for any injury." },
    { id: "dv2", org_id: ORG, document_id: "doc2", version_no: 1, author_id: U2, created_at: iso(22), body: "# Vehicle Safety Policy\n\nAll drivers must complete a pre-trip inspection. Defects must be logged before the vehicle leaves the depot." },
    { id: "dv3", org_id: ORG, document_id: "doc3", version_no: 2, author_id: U2, created_at: iso(2), body: "# Depot Migration Runbook\n\nPhase 1: inventory. Phase 2: transport. Phase 3: cutover. Rollback: revert routing to Depot A." },
  ];
  const document_categories: Row[] = [
    { id: "cat1", org_id: ORG, workspace_id: WS, name: "Safety", color: "#ef4444", created_at: iso(20) },
    { id: "cat2", org_id: ORG, workspace_id: WS, name: "Operations", color: "#0f766e", created_at: iso(20) },
  ];

  const captures: Row[] = [
    { id: "cap1", org_id: ORG, workspace_id: WS, source_type: "meeting", title: "Weekly ops sync", raw_storage_key: null, raw_text: "We agreed to prioritize the depot lease. Alex will redline the contract. Sam needs to finish the inventory audit by Friday. We should schedule technician interviews next week.", status: "reviewed", error: null, created_by: U1, created_at: iso(2), updated_at: iso(2) },
  ];
  const extractions: Row[] = [
    { id: "ex1", org_id: ORG, capture_id: "cap1", model: "heuristic-fallback", summary: "Weekly ops sync. 3 action items detected; lease prioritized.", output: { summary: "Weekly ops sync.", decisions: ["Prioritize depot lease", "Hold lease term at 2 years"], tasks: [] }, token_cost: null, created_at: iso(2) },
  ];
  const work_drafts: Row[] = [
    { id: "wd1", org_id: ORG, workspace_id: WS, extraction_id: "ex1", title: "Redline depot lease contract", description: "Alex to redline and return.", suggested_assignee_id: U2, suggested_due_date: null, suggested_project_id: "p_migration", priority: "high", confidence: 0.82, status: "pending", committed_task_id: null, created_at: iso(2), updated_at: iso(2) },
    { id: "wd2", org_id: ORG, workspace_id: WS, extraction_id: "ex1", title: "Finish inventory audit by Friday", description: null, suggested_assignee_id: U3, suggested_due_date: null, suggested_project_id: "p_migration", priority: "medium", confidence: 0.74, status: "pending", committed_task_id: null, created_at: iso(2), updated_at: iso(2) },
    { id: "wd3", org_id: ORG, workspace_id: WS, extraction_id: "ex1", title: "Schedule technician interviews", description: null, suggested_assignee_id: null, suggested_due_date: null, suggested_project_id: null, priority: "medium", confidence: 0.61, status: "pending", committed_task_id: null, created_at: iso(2), updated_at: iso(2) },
  ];

  const automation_rules: Row[] = [
    { id: "ar1", org_id: ORG, workspace_id: WS, name: "Overdue reminder", trigger_type: "task_overdue", trigger: {}, conditions: [], enabled: true, created_by: U1, created_at: iso(12), updated_at: iso(12) },
    { id: "ar2", org_id: ORG, workspace_id: WS, name: "Escalate critical tasks", trigger_type: "task_created", trigger: {}, conditions: [{ field: "priority", op: "eq", value: "critical" }], enabled: false, created_by: U1, created_at: iso(8), updated_at: iso(8) },
  ];
  const automation_actions: Row[] = [
    { id: "aa1", org_id: ORG, rule_id: "ar1", position: 0, action_type: "notify", params: { message: "This task is overdue" }, created_at: iso(12) },
    { id: "aa2", org_id: ORG, rule_id: "ar2", position: 0, action_type: "set_priority", params: { priority: "critical" }, created_at: iso(8) },
  ];
  const automation_run_logs: Row[] = [
    { id: "al1", org_id: ORG, rule_id: "ar1", context: { matched: 2 }, result: "success", error: null, fired_at: iso(1) },
  ];

  const reportMetrics = {
    totalTasks: 15, completedTasks: 5, pendingTasks: 10, overdueTasks: 4, activeProjects: 2, completionRate: 33,
    byPriority: { low: 2, medium: 6, high: 5, critical: 2 },
    trend: Array.from({ length: 14 }, (_, i) => ({ date: date(13 - i), created: (i % 3) + 1, completed: i % 2 })),
    workload: [{ userId: U2, name: "Alex Rivera", open: 4 }, { userId: U3, name: "Sam Patel", open: 3 }, { userId: U1, name: "Demo Manager", open: 2 }],
  };
  const report_definitions: Row[] = [
    { id: "rd1", org_id: ORG, workspace_id: null, name: "Weekly Ops Review", type: "weekly", scope: { kind: "org" }, schedule: null, recipients: [], created_by: U1, created_at: iso(14), updated_at: iso(1) },
    { id: "rd2", org_id: ORG, workspace_id: null, name: "Monthly Leadership Report", type: "monthly", scope: { kind: "org" }, schedule: null, recipients: [], created_by: U1, created_at: iso(30), updated_at: iso(2) },
  ];
  const report_runs: Row[] = [
    { id: "rr1", org_id: ORG, definition_id: "rd1", period_start: date(7), period_end: date(0), status: "completed", metrics: reportMetrics, ai_summary: "Weekly Ops Review — last 7 days. 15 tasks total, 5 completed (33% completion rate). 10 pending, 4 overdue across 2 active projects. Top load: Alex Rivera (4), Sam Patel (3).", output_key: null, error: null, generated_at: iso(1), created_at: iso(1) },
  ];

  const notifications: Row[] = [
    { id: "n1", org_id: ORG, user_id: U1, type: "task_overdue", channel: "in_app", title: "2 tasks are overdue", body: "Compliance forms and vendor contract review are past due.", payload: { url: `/w/${WS}/tasks` }, read_at: null, created_at: iso(0.2) },
    { id: "n2", org_id: ORG, user_id: U1, type: "mention", channel: "in_app", title: "You were mentioned on: Negotiate depot lease", body: "Agreed, hold at 2 years. @Alex Rivera can you redline?", payload: { url: `/w/${WS}/tasks?task=t5` }, read_at: null, created_at: iso(1) },
    { id: "n3", org_id: ORG, user_id: U1, type: "report_ready", channel: "in_app", title: "Weekly Ops Review is ready", body: "Your weekly report has been generated.", payload: { url: "/demo-co/reports" }, read_at: iso(0.5), created_at: iso(1) },
  ];

  const activity_events: Row[] = [
    { id: "ae1", org_id: ORG, workspace_id: WS, actor_id: U1, actor_type: "user", verb: "created", object_type: "project", object_id: "p_launch", metadata: { name: "Q3 Service Launch" }, created_at: iso(20) },
    { id: "ae2", org_id: ORG, workspace_id: WS, actor_id: U2, actor_type: "user", verb: "completed", object_type: "task", object_id: "t1", metadata: { title: "Confirm pilot-region staffing" }, created_at: iso(8) },
    { id: "ae3", org_id: ORG, workspace_id: WS, actor_id: U1, actor_type: "user", verb: "commented", object_type: "task", object_id: "t5", metadata: { title: "Negotiate depot lease" }, created_at: iso(1) },
    { id: "ae4", org_id: ORG, workspace_id: WS, actor_id: U1, actor_type: "ai", verb: "captured", object_type: "capture", object_id: "cap1", metadata: { source: "meeting", tasks: 3 }, created_at: iso(2) },
    { id: "ae5", org_id: ORG, workspace_id: WS, actor_id: U3, actor_type: "user", verb: "status_changed", object_type: "task", object_id: "t6", metadata: { title: "Inventory audit at Depot A" }, created_at: iso(4) },
  ];

  const attachments: Row[] = [];
  const comment_mentions: Row[] = [{ comment_id: "c2", mentioned_user_id: U2, org_id: ORG }];
  const notification_preferences: Row[] = [];
  const meetings: Row[] = [{ id: "mtg1", org_id: ORG, capture_id: "cap1", title: "Weekly ops sync", occurred_at: iso(2), participants: [], summary: "Weekly ops sync.", decisions: ["Prioritize depot lease"], created_at: iso(2) }];
  const task_templates: Row[] = [
    { id: "tpl1", org_id: ORG, workspace_id: WS, name: "New depot onboarding", definition: { title: "Onboard new depot", priority: "high", subtasks: [{ title: "Set up access" }, { title: "Stock inventory" }, { title: "Assign staff" }] }, created_by: U1, created_at: iso(15), updated_at: iso(15) },
  ];

  return {
    profiles, organizations, org_members, org_invitations, workspaces, workspace_members,
    projects, milestones, project_members, task_statuses, tasks, task_dependencies, tags,
    comments, comment_mentions, attachments, task_templates,
    captures, meetings, extractions, work_drafts,
    documents, doc_versions, document_categories,
    automation_rules, automation_actions, automation_run_logs,
    notifications, notification_preferences, activity_events,
    report_definitions, report_runs,
    departments, teams, team_members: [], task_tags: [], sop_runs: [],
    doc_chunks: [], ai_conversations: [], ai_messages: [],
    role_permissions: [], feature_visibility: [],
    audit_events: [
      { id: "au1", org_id: ORG, actor_id: U1, actor_type: "user", action: "role.changed", entity_type: "member", entity_id: U3, before: { app_role: "viewer" }, after: { app_role: "employee" }, ip: null, created_at: iso(5) },
      { id: "au2", org_id: ORG, actor_id: U1, actor_type: "user", action: "permission.changed", entity_type: "role_permission", entity_id: null, before: { allowed: true }, after: { app_role: "manager", module: "reports", action: "export", allowed: false }, ip: null, created_at: iso(3) },
      { id: "au3", org_id: ORG, actor_id: U1, actor_type: "user", action: "visibility.changed", entity_type: "feature_visibility", entity_id: null, before: { hidden: false }, after: { app_role: "viewer", feature_key: "nav.reports", hidden: true }, ip: null, created_at: iso(1) },
    ],
  };
}

/** Cached store on globalThis so it survives HMR and shares across requests. */
export function getDemoStore(): DemoStore {
  const g = globalThis as unknown as { __opsDemoStore?: DemoStore };
  if (!g.__opsDemoStore) g.__opsDemoStore = buildStore();
  return g.__opsDemoStore;
}
