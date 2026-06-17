import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { createDependencySchema } from "@/lib/validations/task";

type Ctx = { params: Promise<{ taskId: string }> };

/** GET /api/tasks/:taskId/dependencies — dependencies with the linked task titles. */
export async function GET(_request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: deps, error: qErr } = await supabase
    .from("task_dependencies").select("*").eq("task_id", taskId);
  if (qErr) return error(qErr.message, 500);

  const ids = [...new Set((deps ?? []).map((d) => d.depends_on_id))];
  const { data: tasks } = ids.length
    ? await supabase.from("tasks").select("id, title, status_id").in("id", ids)
    : { data: [] };
  const byId = new Map((tasks ?? []).map((t) => [t.id, t]));

  return json({
    dependencies: (deps ?? []).map((d) => ({ ...d, dependsOn: byId.get(d.depends_on_id) ?? null })),
  });
}

/** POST /api/tasks/:taskId/dependencies — add a dependency edge. */
export async function POST(request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createDependencySchema.safeParse(body);
  if (!parsed.success) return error("Invalid dependency", 422);
  if (parsed.data.dependsOnId === taskId) return error("A task cannot depend on itself", 422);

  const { data: task } = await supabase.from("tasks").select("org_id").eq("id", taskId).maybeSingle();
  if (!task) return notFound("Task");

  const { data, error: iErr } = await supabase
    .from("task_dependencies")
    .insert({ org_id: task.org_id, task_id: taskId, depends_on_id: parsed.data.dependsOnId, type: parsed.data.type })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  return json({ dependency: data }, { status: 201 });
}

/** DELETE /api/tasks/:taskId/dependencies?id=… — remove an edge. */
export async function DELETE(request: Request, { params }: Ctx) {
  await params;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return error("id is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { error: dErr } = await supabase.from("task_dependencies").delete().eq("id", id);
  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
