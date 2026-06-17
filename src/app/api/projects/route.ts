import { getAuth, resolveWorkspaceOrg } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { createProjectSchema } from "@/lib/validations/project";
import { logActivity } from "@/services/activity";
import type { ProjectWithStats, PersonLite } from "@/types";

/** GET /api/projects?workspaceId=… — projects with task progress counts. */
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return error("workspaceId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: projects, error: qErr } = await supabase
    .from("projects").select("*").eq("workspace_id", workspaceId).is("archived_at", null)
    .order("created_at", { ascending: false });
  if (qErr) return error(qErr.message, 500);

  const [{ data: tasks }, { data: statuses }, { data: profiles }] = await Promise.all([
    supabase.from("tasks").select("project_id, status_id").eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("task_statuses").select("id, category").eq("workspace_id", workspaceId),
    supabase.from("profiles").select("id, full_name, email, avatar_url"),
  ]);
  const doneStatusIds = new Set((statuses ?? []).filter((s) => s.category === "done").map((s) => s.id));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as PersonLite]));

  const counts = new Map<string, { total: number; done: number }>();
  for (const t of tasks ?? []) {
    if (!t.project_id) continue;
    const c = counts.get(t.project_id) ?? { total: 0, done: 0 };
    c.total++;
    if (doneStatusIds.has(t.status_id)) c.done++;
    counts.set(t.project_id, c);
  }

  const result: ProjectWithStats[] = (projects ?? []).map((p) => {
    const c = counts.get(p.id) ?? { total: 0, done: 0 };
    return {
      ...p,
      owner: p.owner_id ? profileById.get(p.owner_id) ?? null : null,
      taskCount: c.total,
      doneCount: c.done,
    };
  });
  return json({ projects: result });
}

/** POST /api/projects — create a project (creator becomes lead). */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return error("Invalid project", 422, parsed.error.flatten());

  const orgId = await resolveWorkspaceOrg(supabase, parsed.data.workspaceId);
  if (!orgId) return error("Workspace not found", 404);

  const { data: project, error: iErr } = await supabase
    .from("projects")
    .insert({
      org_id: orgId, workspace_id: parsed.data.workspaceId, name: parsed.data.name,
      description: parsed.data.description ?? null, status: parsed.data.status,
      start_date: parsed.data.startDate ?? null, due_date: parsed.data.dueDate ?? null,
      owner_id: parsed.data.ownerId ?? user.id, created_by: user.id,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  if (!project) return error("Could not create project", 403);

  await supabase.from("project_members").insert({
    org_id: orgId, project_id: project.id, user_id: user.id, role: "lead",
  });

  await logActivity(supabase, {
    orgId, workspaceId: parsed.data.workspaceId, actorId: user.id,
    verb: "created", objectType: "project", objectId: project.id, metadata: { name: project.name },
  });

  return json({ project }, { status: 201 });
}
