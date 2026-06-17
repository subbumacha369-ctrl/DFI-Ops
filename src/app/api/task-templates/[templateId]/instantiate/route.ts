import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { logActivity } from "@/services/activity";

type Ctx = { params: Promise<{ templateId: string }> };

type TemplateDef = {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  subtasks?: { title: string }[];
};

/** POST /api/task-templates/:templateId/instantiate — create a task tree from a template. */
export async function POST(request: Request, { params }: Ctx) {
  const { templateId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const projectId = (body?.projectId as string | undefined) ?? null;

  const { data: tpl } = await supabase
    .from("task_templates").select("*").eq("id", templateId).maybeSingle();
  if (!tpl) return notFound("Template");

  const def = tpl.definition as unknown as TemplateDef;
  if (!def?.title) return error("Template has no task definition", 422);

  const { data: statuses } = await supabase
    .from("task_statuses").select("id, is_default, position")
    .eq("workspace_id", tpl.workspace_id).order("position", { ascending: true });
  const statusId = statuses?.find((s) => s.is_default)?.id ?? statuses?.[0]?.id;
  if (!statusId) return error("No statuses configured", 409);

  const { data: parent, error: pErr } = await supabase
    .from("tasks")
    .insert({
      org_id: tpl.org_id, workspace_id: tpl.workspace_id, status_id: statusId,
      title: def.title, description: def.description ?? null, priority: def.priority ?? "medium",
      project_id: projectId, template_id: templateId, created_by: user.id,
    })
    .select("*").maybeSingle();
  if (pErr) return error(pErr.message, 403);
  if (!parent) return error("Could not create task", 403);

  if (def.subtasks?.length) {
    await supabase.from("tasks").insert(
      def.subtasks.map((s) => ({
        org_id: tpl.org_id, workspace_id: tpl.workspace_id, status_id: statusId,
        title: s.title, parent_task_id: parent.id, created_by: user.id,
      })),
    );
  }

  await logActivity(supabase, {
    orgId: tpl.org_id, workspaceId: tpl.workspace_id, actorId: user.id,
    verb: "created", objectType: "task", objectId: parent.id,
    metadata: { fromTemplate: tpl.name },
  });

  return json({ task: parent }, { status: 201 });
}
