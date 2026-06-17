import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";

/** GET /api/task-statuses?workspaceId=… — the workspace's configured workflow. */
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return error("workspaceId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("task_statuses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ statuses: data ?? [] });
}
