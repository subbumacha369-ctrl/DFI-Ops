import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import type { Database } from "@/types/database.types";

type PrefInsert = Database["public"]["Tables"]["notification_preferences"]["Insert"];

/** GET /api/notification-preferences?orgId=… — the user's per-type channel prefs. */
export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return error("orgId is required", 400);
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("notification_preferences").select("*").eq("user_id", user.id).eq("org_id", orgId);
  if (qErr) return error(qErr.message, 500);
  return json({ preferences: data ?? [] });
}

/** PUT /api/notification-preferences — upsert a single preference row. */
export async function PUT(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body?.orgId || !body?.type || !body?.channel) return error("orgId, type, channel required", 422);

  const row: PrefInsert = {
    user_id: user.id, org_id: body.orgId, type: body.type, channel: body.channel,
    enabled: body.enabled !== false, frequency: body.frequency ?? "instant",
  };
  const { data, error: uErr } = await supabase
    .from("notification_preferences")
    .upsert(row, { onConflict: "user_id,org_id,type,channel" })
    .select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  return json({ preference: data });
}
