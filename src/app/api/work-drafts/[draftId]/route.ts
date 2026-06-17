import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import type { Database } from "@/types/database.types";

type Ctx = { params: Promise<{ draftId: string }> };
type DraftUpdate = Database["public"]["Tables"]["work_drafts"]["Update"];

/** PATCH /api/work-drafts/:draftId — edit a draft or reject it. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { draftId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const patch: DraftUpdate = {};
  if (typeof body?.title === "string") patch.title = body.title;
  if (typeof body?.description === "string") patch.description = body.description;
  if (["low", "medium", "high", "critical"].includes(body?.priority)) patch.priority = body.priority;
  if (["pending", "accepted", "edited", "rejected"].includes(body?.status)) patch.status = body.status;
  if (Object.keys(patch).length === 0) return error("No valid fields", 422);

  const { data, error: uErr } = await supabase
    .from("work_drafts").update(patch).eq("id", draftId).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  if (!data) return error("Update not permitted", 403);
  return json({ draft: data });
}
