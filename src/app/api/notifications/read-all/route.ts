import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";

/** POST /api/notifications/read-all — mark all of the user's notifications read. */
export async function POST() {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { error: uErr } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id).is("read_at", null);
  if (uErr) return error(uErr.message, 500);
  return json({ ok: true });
}
