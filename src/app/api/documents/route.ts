import { getAuth, resolveWorkspaceOrg } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { createDocumentSchema } from "@/lib/validations/document";
import { logActivity } from "@/services/activity";

/** GET /api/documents?workspaceId=…&type=&categoryId= */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (!workspaceId) return error("workspaceId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  let q = supabase
    .from("documents").select("*").eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  const type = url.searchParams.get("type");
  const categoryId = url.searchParams.get("categoryId");
  if (type) q = q.eq("type", type as "doc" | "sop" | "policy");
  if (categoryId) q = q.eq("category_id", categoryId);

  const { data, error: qErr } = await q;
  if (qErr) return error(qErr.message, 500);
  return json({ documents: data ?? [] });
}

/** POST /api/documents — create a document with its first version. */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) return error("Invalid document", 422, parsed.error.flatten());

  const orgId = await resolveWorkspaceOrg(supabase, parsed.data.workspaceId);
  if (!orgId) return error("Workspace not found", 404);

  const { data: doc, error: iErr } = await supabase
    .from("documents")
    .insert({
      org_id: orgId, workspace_id: parsed.data.workspaceId, title: parsed.data.title,
      type: parsed.data.type, category_id: parsed.data.categoryId ?? null, created_by: user.id,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  if (!doc) return error("Could not create document", 403);

  const { data: version } = await supabase
    .from("doc_versions")
    .insert({ org_id: orgId, document_id: doc.id, body: parsed.data.body, version_no: 1, author_id: user.id })
    .select("id").maybeSingle();
  if (version) await supabase.from("documents").update({ current_version_id: version.id }).eq("id", doc.id);

  await logActivity(supabase, {
    orgId, workspaceId: parsed.data.workspaceId, actorId: user.id,
    verb: "created", objectType: "document", objectId: doc.id, metadata: { title: doc.title },
  });

  return json({ document: { ...doc, current_version_id: version?.id ?? null } }, { status: 201 });
}
