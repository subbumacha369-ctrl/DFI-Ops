import { getAuth, resolveWorkspaceOrg } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { createCategorySchema } from "@/lib/validations/document";

/** GET /api/document-categories?workspaceId=… */
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return error("workspaceId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("document_categories").select("*").eq("workspace_id", workspaceId).order("name");
  if (qErr) return error(qErr.message, 500);
  return json({ categories: data ?? [] });
}

/** POST /api/document-categories */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return error("Invalid category", 422);

  const orgId = await resolveWorkspaceOrg(supabase, parsed.data.workspaceId);
  if (!orgId) return error("Workspace not found", 404);

  const { data, error: iErr } = await supabase
    .from("document_categories")
    .insert({ org_id: orgId, workspace_id: parsed.data.workspaceId, name: parsed.data.name, color: parsed.data.color ?? "#64748b" })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  return json({ category: data }, { status: 201 });
}
