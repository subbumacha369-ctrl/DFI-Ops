import { getAuth, resolveWorkspaceOrg } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { createTemplateSchema } from "@/lib/validations/task";
import type { Json } from "@/types/database.types";

/** GET /api/task-templates?workspaceId=… */
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return error("workspaceId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("task_templates").select("*").eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (qErr) return error(qErr.message, 500);
  return json({ templates: data ?? [] });
}

/** POST /api/task-templates — save a reusable task definition. */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return error("Invalid template", 422, parsed.error.flatten());

  const orgId = await resolveWorkspaceOrg(supabase, parsed.data.workspaceId);
  if (!orgId) return error("Workspace not found", 404);

  const { data, error: iErr } = await supabase
    .from("task_templates")
    .insert({
      org_id: orgId, workspace_id: parsed.data.workspaceId,
      name: parsed.data.name, definition: parsed.data.definition as Json, created_by: user.id,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  return json({ template: data }, { status: 201 });
}
