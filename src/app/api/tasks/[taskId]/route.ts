import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { updateTaskSchema } from "@/lib/validations/task";
import { logActivity } from "@/services/activity";
import { notify } from "@/services/notifications";
import { nextRecurrence } from "@/lib/recurrence";
import type { Database } from "@/types/database.types";

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

type Ctx = { params: Promise<{ taskId: string }> };

/** GET /api/tasks/:taskId — full task with status, assignee, dependencies, tags. */
export async function GET(_request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: task, error: qErr } = await supabase
    .from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (qErr) return error(qErr.message, 500);
  if (!task) return notFound("Task");

  const [{ data: status }, { data: assignee }, { data: deps }, { data: subtasks }, { data: tagLinks }] =
    await Promise.all([
      supabase.from("task_statuses").select("id, name, category, color").eq("id", task.status_id).maybeSingle(),
      task.assigned_to
        ? supabase.from("profiles").select("id, full_name, email, avatar_url").eq("id", task.assigned_to).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("task_dependencies").select("*").eq("task_id", taskId),
      supabase.from("tasks").select("id, title, status_id, completed_at").eq("parent_task_id", taskId).is("archived_at", null),
      supabase.from("task_tags").select("tag_id").eq("task_id", taskId),
    ]);

  return json({
    task: { ...task, status: status ?? null, assignee: assignee ?? null },
    dependencies: deps ?? [],
    subtasks: subtasks ?? [],
    tagIds: (tagLinks ?? []).map((t) => t.tag_id),
  });
}

/** PATCH /api/tasks/:taskId — update fields; handles status workflow + recurrence. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update", 422, parsed.error.flatten());

  const { data: current } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!current) return notFound("Task");

  const patch: TaskUpdate = {};
  const d = parsed.data;
  if (d.title !== undefined) patch.title = d.title;
  if (d.description !== undefined) patch.description = d.description;
  if (d.priority !== undefined) patch.priority = d.priority;
  if (d.projectId !== undefined) patch.project_id = d.projectId;
  if (d.milestoneId !== undefined) patch.milestone_id = d.milestoneId;
  if (d.dueDate !== undefined) patch.due_date = d.dueDate;
  if (d.startDate !== undefined) patch.start_date = d.startDate;
  if (d.recurrenceRule !== undefined) patch.recurrence_rule = d.recurrenceRule;
  if (d.position !== undefined) patch.position = d.position;
  if (d.assignedTo !== undefined) {
    patch.assigned_to = d.assignedTo;
    patch.assigned_by = d.assignedTo ? user.id : null;
  }

  let movedToDone = false;
  let movedToVerified = false;
  if (d.statusId !== undefined && d.statusId !== current.status_id) {
    patch.status_id = d.statusId;
    const { data: status } = await supabase
      .from("task_statuses").select("category, name").eq("id", d.statusId).maybeSingle();
    if (status?.category === "done") {
      movedToDone = true;
      patch.completed_at = new Date().toISOString();
      if (status.name.toLowerCase() === "verified") {
        movedToVerified = true;
        patch.verified_at = new Date().toISOString();
        patch.verified_by = user.id;
      }
    } else {
      patch.completed_at = null;
    }
  }

  const { data: updated, error: uErr } = await supabase
    .from("tasks").update(patch).eq("id", taskId).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  if (!updated) return error("Update not permitted", 403);

  await logActivity(supabase, {
    orgId: updated.org_id, workspaceId: updated.workspace_id, actorId: user.id,
    verb: d.statusId ? "status_changed" : "updated", objectType: "task", objectId: taskId,
    metadata: { title: updated.title },
  });

  // Notify on reassignment.
  if (d.assignedTo && d.assignedTo !== current.assigned_to && d.assignedTo !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", d.assignedTo).maybeSingle();
    await notify(supabase, {
      orgId: updated.org_id, userId: d.assignedTo, type: "task_assigned",
      title: `You were assigned: ${updated.title}`,
      url: `/w/${updated.workspace_id}/tasks?task=${taskId}`,
      email: profile?.email, alsoEmail: true,
    });
  }

  // Notify the creator on completion.
  if (movedToDone && current.created_by !== user.id) {
    await notify(supabase, {
      orgId: updated.org_id, userId: current.created_by, type: "task_completed",
      title: `Task completed: ${updated.title}`,
      url: `/w/${updated.workspace_id}/tasks?task=${taskId}`,
    });
  }

  // Recurrence: when a recurring task is completed, spawn the next occurrence.
  let spawned: string | null = null;
  if (movedToDone && updated.recurrence_rule && updated.due_date) {
    const next = nextRecurrence(updated.recurrence_rule, new Date(updated.due_date));
    if (next) {
      const { data: clone } = await supabase
        .from("tasks")
        .insert({
          org_id: updated.org_id, workspace_id: updated.workspace_id, status_id: current.status_id,
          title: updated.title, description: updated.description, priority: updated.priority,
          project_id: updated.project_id, assigned_to: updated.assigned_to, assigned_by: updated.assigned_by,
          due_date: next.toISOString(), recurrence_rule: updated.recurrence_rule, created_by: user.id,
        })
        .select("id").maybeSingle();
      spawned = clone?.id ?? null;
    }
  }

  return json({ task: updated, spawnedRecurrenceId: spawned, verified: movedToVerified });
}

/** DELETE /api/tasks/:taskId — soft-delete (archive). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: task } = await supabase.from("tasks").select("org_id, workspace_id, title").eq("id", taskId).maybeSingle();
  const { error: uErr } = await supabase
    .from("tasks").update({ archived_at: new Date().toISOString() }).eq("id", taskId);
  if (uErr) return error(uErr.message, 403);

  if (task) {
    await logActivity(supabase, {
      orgId: task.org_id, workspaceId: task.workspace_id, actorId: user.id,
      verb: "deleted", objectType: "task", objectId: taskId, metadata: { title: task.title },
    });
  }
  return json({ ok: true });
}
