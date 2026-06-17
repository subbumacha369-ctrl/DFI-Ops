import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { confirmDraftSchema } from "@/lib/validations/capture";
import { logActivity } from "@/services/activity";
import { notify } from "@/services/notifications";

type Ctx = { params: Promise<{ draftId: string }> };

/**
 * POST /api/work-drafts/:draftId/confirm — the Track step.
 * Promotes a confirmed AI draft into a real, tracked task (with optional edits)
 * and links it back to the draft for provenance.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { draftId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = confirmDraftSchema.safeParse(body ?? {});
  if (!parsed.success) return error("Invalid confirmation", 422, parsed.error.flatten());
  const overrides = parsed.data;

  const { data: draft } = await supabase.from("work_drafts").select("*").eq("id", draftId).maybeSingle();
  if (!draft) return notFound("Draft");
  if (draft.committed_task_id) return error("Draft already committed", 409);

  const { data: statuses } = await supabase
    .from("task_statuses").select("id, is_default, position")
    .eq("workspace_id", draft.workspace_id).order("position", { ascending: true });
  const statusId = statuses?.find((s) => s.is_default)?.id ?? statuses?.[0]?.id;
  if (!statusId) return error("No statuses configured", 409);

  // Extraction provenance → the capture that produced this draft.
  const { data: extraction } = await supabase
    .from("extractions").select("capture_id").eq("id", draft.extraction_id).maybeSingle();

  const { data: task, error: iErr } = await supabase
    .from("tasks")
    .insert({
      org_id: draft.org_id, workspace_id: draft.workspace_id, status_id: statusId,
      title: overrides.title ?? draft.title,
      description: overrides.description ?? draft.description,
      priority: overrides.priority ?? draft.priority,
      assigned_to: overrides.assignedTo ?? draft.suggested_assignee_id,
      assigned_by: (overrides.assignedTo ?? draft.suggested_assignee_id) ? user.id : null,
      due_date: overrides.dueDate ?? draft.suggested_due_date,
      project_id: overrides.projectId ?? draft.suggested_project_id,
      capture_id: extraction?.capture_id ?? null,
      source_confidence: draft.confidence,
      created_by: user.id,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  if (!task) return error("Could not create task", 403);

  await supabase.from("work_drafts").update({ status: "accepted", committed_task_id: task.id }).eq("id", draftId);

  await logActivity(supabase, {
    orgId: draft.org_id, workspaceId: draft.workspace_id, actorId: user.id,
    verb: "confirmed", objectType: "task", objectId: task.id, metadata: { fromDraft: draftId },
  });

  if (task.assigned_to && task.assigned_to !== user.id) {
    await notify(supabase, {
      orgId: draft.org_id, userId: task.assigned_to, type: "task_assigned",
      title: `You were assigned: ${task.title}`,
      url: `/w/${draft.workspace_id}/tasks?task=${task.id}`,
    });
  }

  return json({ task }, { status: 201 });
}
