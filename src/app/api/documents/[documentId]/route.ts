import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { updateDocumentSchema } from "@/lib/validations/document";
import { logActivity } from "@/services/activity";
import type { Database } from "@/types/database.types";

type Ctx = { params: Promise<{ documentId: string }> };
type DocUpdate = Database["public"]["Tables"]["documents"]["Update"];

/** GET /api/documents/:documentId — document with current version body + history. */
export async function GET(_request: Request, { params }: Ctx) {
  const { documentId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: doc, error: qErr } = await supabase
    .from("documents").select("*").eq("id", documentId).maybeSingle();
  if (qErr) return error(qErr.message, 500);
  if (!doc) return notFound("Document");

  const [{ data: current }, { data: versions }] = await Promise.all([
    doc.current_version_id
      ? supabase.from("doc_versions").select("*").eq("id", doc.current_version_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("doc_versions").select("id, version_no, author_id, created_at").eq("document_id", documentId).order("version_no", { ascending: false }),
  ]);

  return json({ document: doc, body: current?.body ?? "", versions: versions ?? [] });
}

/** PATCH /api/documents/:documentId — metadata and/or a new content version. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { documentId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update", 422, parsed.error.flatten());

  const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
  if (!doc) return notFound("Document");

  // New content version when body provided.
  let newVersionId: string | undefined;
  if (parsed.data.body !== undefined) {
    const { data: last } = await supabase
      .from("doc_versions").select("version_no").eq("document_id", documentId)
      .order("version_no", { ascending: false }).limit(1).maybeSingle();
    const versionNo = (last?.version_no ?? 0) + 1;
    const { data: version } = await supabase
      .from("doc_versions")
      .insert({ org_id: doc.org_id, document_id: documentId, body: parsed.data.body, version_no: versionNo, author_id: user.id })
      .select("id").maybeSingle();
    newVersionId = version?.id;
  }

  const patch: DocUpdate = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.type !== undefined) patch.type = parsed.data.type;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.categoryId !== undefined) patch.category_id = parsed.data.categoryId;
  if (newVersionId) patch.current_version_id = newVersionId;

  const { data: updated, error: uErr } = await supabase
    .from("documents").update(patch).eq("id", documentId).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  if (!updated) return error("Update not permitted", 403);

  await logActivity(supabase, {
    orgId: doc.org_id, workspaceId: doc.workspace_id, actorId: user.id,
    verb: "updated", objectType: "document", objectId: documentId, metadata: { title: updated.title },
  });
  return json({ document: updated });
}

/** DELETE /api/documents/:documentId */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { documentId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { error: dErr } = await supabase.from("documents").delete().eq("id", documentId);
  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
