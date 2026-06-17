import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { createCommentSchema } from "@/lib/validations/task";
import { logActivity } from "@/services/activity";
import { notify } from "@/services/notifications";
import type { CommentWithAuthor, PersonLite } from "@/types";

type Ctx = { params: Promise<{ taskId: string }> };

/** GET /api/tasks/:taskId/comments — thread with authors. */
export async function GET(_request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: comments, error: qErr } = await supabase
    .from("comments")
    .select("*")
    .eq("entity_type", "task")
    .eq("entity_id", taskId)
    .order("created_at", { ascending: true });
  if (qErr) return error(qErr.message, 500);

  const authorIds = [...new Set((comments ?? []).map((c) => c.author_id))];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", authorIds)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p as PersonLite]));

  const result: CommentWithAuthor[] = (comments ?? []).map((c) => ({
    ...c,
    author: byId.get(c.author_id) ?? null,
  }));
  return json({ comments: result });
}

/** POST /api/tasks/:taskId/comments — add a comment, resolve mentions, notify. */
export async function POST(request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) return error("Invalid comment", 422, parsed.error.flatten());

  const { data: task } = await supabase
    .from("tasks").select("org_id, workspace_id, title, assigned_to, created_by").eq("id", taskId).maybeSingle();
  if (!task) return notFound("Task");

  const { data: comment, error: iErr } = await supabase
    .from("comments")
    .insert({
      org_id: task.org_id, workspace_id: task.workspace_id,
      entity_type: "task", entity_id: taskId, author_id: user.id,
      body: parsed.data.body, parent_comment_id: parsed.data.parentCommentId ?? null,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  if (!comment) return error("Could not add comment", 403);

  const mentions = parsed.data.mentions ?? [];
  if (mentions.length) {
    await supabase.from("comment_mentions").insert(
      mentions.map((uid) => ({ comment_id: comment.id, mentioned_user_id: uid, org_id: task.org_id })),
    );
  }

  await logActivity(supabase, {
    orgId: task.org_id, workspaceId: task.workspace_id, actorId: user.id,
    verb: "commented", objectType: "task", objectId: taskId, metadata: { title: task.title },
  });

  // Notify mentioned users + the assignee/creator (deduped, never self).
  const recipients = new Set<string>(mentions);
  if (task.assigned_to) recipients.add(task.assigned_to);
  if (task.created_by) recipients.add(task.created_by);
  recipients.delete(user.id);
  for (const uid of recipients) {
    const mentioned = mentions.includes(uid);
    await notify(supabase, {
      orgId: task.org_id, userId: uid,
      type: mentioned ? "mention" : "comment_added",
      title: mentioned ? `You were mentioned on: ${task.title}` : `New comment on: ${task.title}`,
      body: parsed.data.body.slice(0, 160),
      url: `/w/${task.workspace_id}/tasks?task=${taskId}`,
    });
  }

  return json({ comment }, { status: 201 });
}
