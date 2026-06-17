import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { updateMilestoneSchema } from "@/lib/validations/project";
import type { Database } from "@/types/database.types";

type Ctx = { params: Promise<{ projectId: string; milestoneId: string }> };
type MilestoneUpdate = Database["public"]["Tables"]["milestones"]["Update"];

/** PATCH /api/projects/:projectId/milestones/:milestoneId */
export async function PATCH(request: Request, { params }: Ctx) {
  const { milestoneId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateMilestoneSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update", 422);

  const patch: MilestoneUpdate = {};
  const d = parsed.data;
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  if (d.dueDate !== undefined) patch.due_date = d.dueDate;
  if (d.status !== undefined) {
    patch.status = d.status;
    patch.completed_at = d.status === "completed" ? new Date().toISOString() : null;
  }

  const { data, error: uErr } = await supabase
    .from("milestones").update(patch).eq("id", milestoneId).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  if (!data) return error("Update not permitted", 403);
  return json({ milestone: data });
}

/** DELETE /api/projects/:projectId/milestones/:milestoneId */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { milestoneId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { error: dErr } = await supabase.from("milestones").delete().eq("id", milestoneId);
  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
