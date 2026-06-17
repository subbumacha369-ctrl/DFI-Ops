import { getAuth, resolveWorkspaceOrg } from "@/lib/auth-route";
import { json, error, unauthorized, tooMany } from "@/lib/api";
import { checkLimit, writeRatelimit } from "@/lib/redis";
import { createTaskSchema } from "@/lib/validations/task";
import { logActivity } from "@/services/activity";
import { notify } from "@/services/notifications";
import type { TaskWithRelations, PersonLite } from "@/types";

/** GET /api/tasks?workspaceId=…&projectId=…&assignedTo=…&statusId=… */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (!workspaceId) return error("workspaceId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  let q = supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  const projectId = url.searchParams.get("projectId");
  const assignedTo = url.searchParams.get("assignedTo");
  const statusId = url.searchParams.get("statusId");
  const parentTaskId = url.searchParams.get("parentTaskId");
  if (projectId) q = q.eq("project_id", projectId);
  if (assignedTo) q = q.eq("assigned_to", assignedTo);
  if (statusId) q = q.eq("status_id", statusId);
  if (parentTaskId) q = q.eq("parent_task_id", parentTaskId);
  else if (url.searchParams.get("topLevel") === "1") q = q.is("parent_task_id", null);

  const { data: tasks, error: qErr } = await q;
  if (qErr) return error(qErr.message, 500);

  const rows = tasks ?? [];
  const [{ data: statuses }, { data: profiles }, { data: projects }] = await Promise.all([
    supabase.from("task_statuses").select("id, name, category, color").eq("workspace_id", workspaceId),
    supabase.from("profiles").select("id, full_name, email, avatar_url"),
    supabase.from("projects").select("id, name").eq("workspace_id", workspaceId),
  ]);

  const statusById = new Map((statuses ?? []).map((s) => [s.id, s]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as PersonLite]));
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const result: TaskWithRelations[] = rows.map((t) => ({
    ...t,
    status: statusById.get(t.status_id) ?? null,
    assignee: t.assigned_to ? profileById.get(t.assigned_to) ?? null : null,
    project: t.project_id ? projectById.get(t.project_id) ?? null : null,
  }));

  return json({ tasks: result });
}

/** POST /api/tasks — create a task (defaults to the workspace's default status). */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { success } = await checkLimit(writeRatelimit, `task-create:${user.id}`);
  if (!success) return tooMany();

  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return error("Invalid task", 422, parsed.error.flatten());
  const input = parsed.data;

  const orgId = await resolveWorkspaceOrg(supabase, input.workspaceId);
  if (!orgId) return error("Workspace not found", 404);

  // Resolve a status: explicit, else the workspace default, else first by position.
  let statusId = input.statusId;
  if (!statusId) {
    const { data: statuses } = await supabase
      .from("task_statuses")
      .select("id, is_default, position")
      .eq("workspace_id", input.workspaceId)
      .order("position", { ascending: true });
    statusId = statuses?.find((s) => s.is_default)?.id ?? statuses?.[0]?.id;
  }
  if (!statusId) return error("No task statuses configured for this workspace", 409);

  const { data: task, error: iErr } = await supabase
    .from("tasks")
    .insert({
      org_id: orgId,
      workspace_id: input.workspaceId,
      status_id: statusId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      project_id: input.projectId ?? null,
      milestone_id: input.milestoneId ?? null,
      parent_task_id: input.parentTaskId ?? null,
      assigned_to: input.assignedTo ?? null,
      assigned_by: input.assignedTo ? user.id : null,
      due_date: input.dueDate ?? null,
      start_date: input.startDate ?? null,
      recurrence_rule: input.recurrenceRule ?? null,
      created_by: user.id,
    })
    .select("*")
    .maybeSingle();

  if (iErr) return error(iErr.message, 403);
  if (!task) return error("Could not create task", 403);

  // Tags (optional).
  if (input.tagIds?.length) {
    await supabase.from("task_tags").insert(
      input.tagIds.map((tagId) => ({ task_id: task.id, tag_id: tagId, org_id: orgId })),
    );
  }

  await logActivity(supabase, {
    orgId, workspaceId: input.workspaceId, actorId: user.id,
    verb: "created", objectType: "task", objectId: task.id,
    metadata: { title: task.title },
  });

  // Notify the assignee (if someone other than the creator).
  if (task.assigned_to && task.assigned_to !== user.id) {
    const { data: profile } = await supabase
      .from("profiles").select("email").eq("id", task.assigned_to).maybeSingle();
    await notify(supabase, {
      orgId, userId: task.assigned_to, type: "task_assigned",
      title: `You were assigned: ${task.title}`,
      url: `/w/${input.workspaceId}/tasks?task=${task.id}`,
      email: profile?.email, alsoEmail: true,
    });
  }

  return json({ task }, { status: 201 });
}
