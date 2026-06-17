import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { updateProjectSchema } from "@/lib/validations/project";
import { logActivity } from "@/services/activity";
import type { Database } from "@/types/database.types";

type Ctx = { params: Promise<{ projectId: string }> };
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

/** GET /api/projects/:projectId — detail with milestones, members, and progress. */
export async function GET(_request: Request, { params }: Ctx) {
  const { projectId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: project, error: qErr } = await supabase
    .from("projects").select("*").eq("id", projectId).maybeSingle();
  if (qErr) return error(qErr.message, 500);
  if (!project) return notFound("Project");

  const [{ data: milestones }, { data: members }, { data: tasks }, { data: statuses }, { data: profiles }] =
    await Promise.all([
      supabase.from("milestones").select("*").eq("project_id", projectId).order("position", { ascending: true }),
      supabase.from("project_members").select("*").eq("project_id", projectId),
      supabase.from("tasks").select("id, status_id, due_date, completed_at").eq("project_id", projectId).is("archived_at", null),
      supabase.from("task_statuses").select("id, category").eq("workspace_id", project.workspace_id),
      supabase.from("profiles").select("id, full_name, email, avatar_url"),
    ]);

  const doneIds = new Set((statuses ?? []).filter((s) => s.category === "done").map((s) => s.id));
  const total = (tasks ?? []).length;
  const done = (tasks ?? []).filter((t) => doneIds.has(t.status_id)).length;
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return json({
    project,
    milestones: milestones ?? [],
    members: (members ?? []).map((m) => ({ ...m, profile: profileById.get(m.user_id) ?? null })),
    progress: { total, done, rate: total ? Math.round((done / total) * 100) : 0 },
  });
}

/** PATCH /api/projects/:projectId */
export async function PATCH(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update", 422, parsed.error.flatten());

  const patch: ProjectUpdate = {};
  const d = parsed.data;
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  if (d.status !== undefined) patch.status = d.status;
  if (d.startDate !== undefined) patch.start_date = d.startDate;
  if (d.dueDate !== undefined) patch.due_date = d.dueDate;
  if (d.ownerId !== undefined) patch.owner_id = d.ownerId;

  const { data, error: uErr } = await supabase
    .from("projects").update(patch).eq("id", projectId).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  if (!data) return error("Update not permitted", 403);

  await logActivity(supabase, {
    orgId: data.org_id, workspaceId: data.workspace_id, actorId: user.id,
    verb: "updated", objectType: "project", objectId: projectId, metadata: { name: data.name },
  });
  return json({ project: data });
}

/** DELETE /api/projects/:projectId — archive. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { projectId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { error: uErr } = await supabase
    .from("projects").update({ archived_at: new Date().toISOString() }).eq("id", projectId);
  if (uErr) return error(uErr.message, 403);
  return json({ ok: true });
}
