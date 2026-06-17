import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { updateWorkspaceSchema } from "@/lib/validations/workspace";

type Ctx = { params: Promise<{ workspaceId: string }> };

/** GET /api/workspaces/:workspaceId — detail (RLS limits to members/org admins). */
export async function GET(_request: Request, { params }: Ctx) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle();

  if (qErr) return error(qErr.message, 500);
  if (!data) return notFound("Workspace");
  return json({ workspace: data });
}

/** PATCH /api/workspaces/:workspaceId — update (RLS limits to workspace admins). */
export async function PATCH(request: Request, { params }: Ctx) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateWorkspaceSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update", 422, parsed.error.flatten());

  const { data, error: uErr } = await supabase
    .from("workspaces")
    .update(parsed.data)
    .eq("id", workspaceId)
    .select("*")
    .maybeSingle();

  if (uErr) return error(uErr.message, 403);
  if (!data) return error("Update not permitted", 403);
  return json({ workspace: data });
}

/** DELETE /api/workspaces/:workspaceId — archive (soft delete). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { error: uErr } = await supabase
    .from("workspaces")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", workspaceId);

  if (uErr) return error(uErr.message, 403);
  return json({ ok: true });
}
