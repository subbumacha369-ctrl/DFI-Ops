import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/notifications/:id — mark a single notification read/unread. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const read = body?.read !== false;

  const { data, error: uErr } = await supabase
    .from("notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id).eq("user_id", user.id).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  return json({ notification: data });
}
