import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import type { PersonLite } from "@/types";

/** GET /api/activity?orgId=…&workspaceId=… — activity feed with actor profiles. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const workspaceId = url.searchParams.get("workspaceId");
  if (!orgId) return error("orgId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  let q = supabase
    .from("activity_events").select("*").eq("org_id", orgId)
    .order("created_at", { ascending: false }).limit(100);
  if (workspaceId) q = q.eq("workspace_id", workspaceId);

  const { data: events, error: qErr } = await q;
  if (qErr) return error(qErr.message, 500);

  const actorIds = [...new Set((events ?? []).map((e) => e.actor_id).filter(Boolean) as string[])];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", actorIds)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p as PersonLite]));

  return json({
    events: (events ?? []).map((e) => ({ ...e, actor: e.actor_id ? byId.get(e.actor_id) ?? null : null })),
  });
}
