import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";

type Ctx = { params: Promise<{ taskId: string }> };
const BUCKET = "attachments";

/** GET /api/tasks/:taskId/attachments — list with short-lived signed URLs. */
export async function GET(_request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("attachments")
    .select("*")
    .eq("entity_type", "task")
    .eq("entity_id", taskId)
    .order("created_at", { ascending: false });
  if (qErr) return error(qErr.message, 500);

  const withUrls = await Promise.all(
    (data ?? []).map(async (a) => {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_key, 3600);
      return { ...a, url: signed?.signedUrl ?? null };
    }),
  );
  return json({ attachments: withUrls });
}

/**
 * POST /api/tasks/:taskId/attachments — record an attachment and return a signed
 * upload URL. The client uploads the file bytes directly to Storage.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { taskId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const filename = (body?.filename as string | undefined)?.trim();
  if (!filename) return error("filename is required", 422);

  const { data: task } = await supabase
    .from("tasks").select("org_id, workspace_id").eq("id", taskId).maybeSingle();
  if (!task) return notFound("Task");

  const key = `${task.org_id}/${task.workspace_id}/task/${taskId}/${crypto.randomUUID()}-${filename}`;
  const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUploadUrl(key);
  if (sErr) return error(sErr.message, 500);

  const { data: attachment, error: iErr } = await supabase
    .from("attachments")
    .insert({
      org_id: task.org_id, workspace_id: task.workspace_id,
      entity_type: "task", entity_id: taskId, storage_key: key,
      filename, mime_type: body?.mimeType ?? null, size_bytes: body?.sizeBytes ?? null,
      uploaded_by: user.id,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);

  return json({ attachment, upload: { path: key, token: signed.token } }, { status: 201 });
}

/** DELETE /api/tasks/:taskId/attachments?id=… — remove the row and the object. */
export async function DELETE(request: Request, { params }: Ctx) {
  await params;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return error("id is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: att } = await supabase.from("attachments").select("storage_key").eq("id", id).maybeSingle();
  if (att?.storage_key) await supabase.storage.from(BUCKET).remove([att.storage_key]);
  const { error: dErr } = await supabase.from("attachments").delete().eq("id", id);
  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
