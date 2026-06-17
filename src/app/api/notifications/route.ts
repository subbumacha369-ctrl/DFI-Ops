import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";

/** GET /api/notifications?unread=1 — the current user's notifications (RLS-scoped). */
export async function GET(request: Request) {
  const unreadOnly = new URL(request.url).searchParams.get("unread") === "1";
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  let q = supabase
    .from("notifications").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(100);
  if (unreadOnly) q = q.is("read_at", null);

  const { data, error: qErr } = await q;
  if (qErr) return error(qErr.message, 500);

  const { count } = await supabase
    .from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);

  return json({ notifications: data ?? [], unreadCount: count ?? 0 });
}
