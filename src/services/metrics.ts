import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export type MetricsFilters = {
  workspaceId?: string;
  days?: number;
  projectId?: string;
  assignedTo?: string;
  departmentId?: string;
  teamId?: string;
  from?: string;        // ISO date — created_at lower bound
  to?: string;          // ISO date — created_at upper bound
};

export type OrgMetrics = {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  activeProjects: number;
  delayedProjects: number;
  completionRate: number;
  byPriority: Record<string, number>;
  trend: { date: string; created: number; completed: number }[];
  workload: { userId: string; name: string; open: number }[];
};

const PRIORITIES = ["low", "medium", "high", "critical"] as const;
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

/** Resolve the set of user ids in a department/team (for those filters). */
async function usersInScope(client: Client, orgId: string, f: MetricsFilters): Promise<Set<string> | null> {
  if (!f.departmentId && !f.teamId) return null;
  const { data } = await client.from("org_members").select("user_id, department_id, team_id").eq("org_id", orgId);
  const set = new Set<string>();
  for (const m of data ?? []) {
    if (f.departmentId && m.department_id !== f.departmentId) continue;
    if (f.teamId && m.team_id !== f.teamId) continue;
    set.add(m.user_id);
  }
  return set;
}

/** Fetch active, non-archived tasks for an org with the given filters applied. */
async function fetchTasks(client: Client, orgId: string, f: MetricsFilters): Promise<TaskRow[]> {
  let q = client.from("tasks").select("*").eq("org_id", orgId).is("archived_at", null);
  if (f.workspaceId) q = q.eq("workspace_id", f.workspaceId);
  if (f.projectId) q = q.eq("project_id", f.projectId);
  if (f.assignedTo) q = q.eq("assigned_to", f.assignedTo);
  if (f.from) q = q.gte("created_at", f.from);
  if (f.to) q = q.lte("created_at", f.to);
  const { data } = await q;
  let rows = (data ?? []) as TaskRow[];
  const scope = await usersInScope(client, orgId, f);
  if (scope) rows = rows.filter((t) => t.assigned_to && scope.has(t.assigned_to));
  return rows;
}

export async function computeOrgMetrics(client: Client, orgId: string, f: MetricsFilters = {}): Promise<OrgMetrics> {
  const days = f.days ?? 14;
  const since = new Date(Date.now() - days * 86_400_000);
  const now = Date.now();

  const [rows, projectsRes, profilesRes] = await Promise.all([
    fetchTasks(client, orgId, f),
    f.workspaceId
      ? client.from("projects").select("id, status, due_date, archived_at").eq("workspace_id", f.workspaceId).is("archived_at", null)
      : client.from("projects").select("id, status, due_date, archived_at").eq("org_id", orgId).is("archived_at", null),
    client.from("profiles").select("id, full_name, email"),
  ]);

  const completedTasks = rows.filter((t) => t.completed_at).length;
  const overdueTasks = rows.filter((t) => !t.completed_at && t.due_date && new Date(t.due_date).getTime() < now).length;
  const totalTasks = rows.length;
  const pendingTasks = totalTasks - completedTasks;
  const projects = projectsRes.data ?? [];
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const delayedProjects = projects.filter((p) => p.status !== "completed" && p.due_date && new Date(p.due_date).getTime() < now).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const byPriority: Record<string, number> = {};
  for (const p of PRIORITIES) byPriority[p] = 0;
  for (const t of rows) byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;

  const trendMap = new Map<string, { created: number; completed: number }>();
  for (let i = days - 1; i >= 0; i--) trendMap.set(new Date(now - i * 86_400_000).toISOString().slice(0, 10), { created: 0, completed: 0 });
  for (const t of rows) {
    const c = t.created_at?.slice(0, 10);
    if (c && trendMap.has(c) && new Date(t.created_at) >= since) trendMap.get(c)!.created++;
    const done = t.completed_at?.slice(0, 10);
    if (done && trendMap.has(done)) trendMap.get(done)!.completed++;
  }
  const trend = [...trendMap.entries()].map(([date, v]) => ({ date, ...v }));

  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const workloadMap = new Map<string, number>();
  for (const t of rows) if (t.assigned_to && !t.completed_at) workloadMap.set(t.assigned_to, (workloadMap.get(t.assigned_to) ?? 0) + 1);
  const workload = [...workloadMap.entries()]
    .map(([userId, open]) => { const p = profileById.get(userId); return { userId, name: p?.full_name ?? p?.email ?? "Unknown", open }; })
    .sort((a, b) => b.open - a.open).slice(0, 10);

  return { totalTasks, completedTasks, pendingTasks, overdueTasks, activeProjects, delayedProjects, completionRate, byPriority, trend, workload };
}

export type DrillRow = { id: string; title: string; meta: string; href?: string };

/** Return the underlying rows for a clicked dashboard widget. */
export async function computeDrilldown(
  client: Client, orgId: string, bucket: string, f: MetricsFilters & { userId?: string },
): Promise<{ title: string; rows: DrillRow[] }> {
  const now = Date.now();

  if (bucket.startsWith("project")) {
    const { data } = f.workspaceId
      ? await client.from("projects").select("*").eq("workspace_id", f.workspaceId).is("archived_at", null)
      : await client.from("projects").select("*").eq("org_id", orgId).is("archived_at", null);
    let projects = data ?? [];
    let title = "All projects";
    if (bucket === "project_active") { projects = projects.filter((p) => p.status === "active"); title = "Active projects"; }
    if (bucket === "project_delayed") { projects = projects.filter((p) => p.status !== "completed" && p.due_date && new Date(p.due_date).getTime() < now); title = "Delayed projects"; }
    return {
      title,
      rows: projects.map((p) => ({ id: p.id, title: p.name, meta: `${p.status}${p.due_date ? " · due " + p.due_date : ""}`,
        href: `/w/${p.workspace_id}/projects/${p.id}` })),
    };
  }

  // task / employee buckets
  const rows = await fetchTasks(client, orgId, f);
  const profiles = (await client.from("profiles").select("id, full_name, email")).data ?? [];
  const pById = new Map(profiles.map((p) => [p.id, p]));
  let list = rows;
  let title = "All tasks";
  if (bucket === "task_completed") { list = rows.filter((t) => t.completed_at); title = "Completed tasks"; }
  else if (bucket === "task_pending") { list = rows.filter((t) => !t.completed_at); title = "Pending tasks"; }
  else if (bucket === "task_overdue") { list = rows.filter((t) => !t.completed_at && t.due_date && new Date(t.due_date).getTime() < now); title = "Overdue tasks"; }
  else if (bucket === "employee" && f.userId) { list = rows.filter((t) => t.assigned_to === f.userId && !t.completed_at); title = `Workload — ${pById.get(f.userId)?.full_name ?? "employee"}`; }

  return {
    title,
    rows: list.map((t) => {
      const a = t.assigned_to ? pById.get(t.assigned_to) : null;
      return { id: t.id, title: t.title, meta: `${t.priority}${a ? " · " + (a.full_name ?? a.email) : ""}${t.due_date ? " · due " + t.due_date.slice(0, 10) : ""}`,
        href: `/w/${t.workspace_id}/tasks?task=${t.id}` };
    }),
  };
}
