import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import type { PersonLite } from "@/types";

type Ctx = { params: Promise<{ orgId: string }> };

/** GET /api/organizations/:orgId/audit — audit trail (admins only via RLS). */
export async function GET(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const filter = url.searchParams.get("action"); // optional prefix filter

  const { data: events, error: qErr } = await supabase
    .from("audit_events").select("*").eq("org_id", orgId)
    .order("created_at", { ascending: false }).limit(200);
  if (qErr) return error(qErr.message, 500);

  const rows = (events ?? []).filter((e) => !filter || e.action.startsWith(filter));
  const actorIds = [...new Set(rows.map((e) => e.actor_id).filter(Boolean) as string[])];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", actorIds)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p as PersonLite]));

  return json({ events: rows.map((e) => ({ ...e, actor: e.actor_id ? byId.get(e.actor_id) ?? null : null })) });
}
