import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized, tooMany } from "@/lib/api";
import { checkLimit, writeRatelimit } from "@/lib/redis";
import { createWorkspaceSchema } from "@/lib/validations/workspace";

/** POST /api/workspaces — create a workspace (+ creator as admin, statuses). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { success } = await checkLimit(writeRatelimit, `ws-create:${user.id}`);
  if (!success) return tooMany();

  const body = await request.json().catch(() => null);
  const parsed = createWorkspaceSchema.safeParse(body);
  if (!parsed.success) return error("Invalid workspace details", 422, parsed.error.flatten());

  const { data, error: rpcError } = await supabase.rpc("create_workspace", {
    p_org_id: parsed.data.orgId,
    p_name: parsed.data.name,
    p_icon: parsed.data.icon ?? null,
    p_description: parsed.data.description ?? null,
  });

  if (rpcError || !data) {
    return error(rpcError?.message ?? "Could not create workspace", 500);
  }
  return json({ workspaceId: data }, { status: 201 });
}

/** GET /api/workspaces?orgId=… — workspaces in an org the user can see (RLS). */
export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return error("orgId is required", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("workspaces")
    .select("*")
    .eq("org_id", orgId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ workspaces: data ?? [] });
}
