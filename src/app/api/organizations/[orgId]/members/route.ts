import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized } from "@/lib/api";
import { updateMemberRoleSchema } from "@/lib/validations/organization";
import type { MemberDirectoryRow } from "@/types";

type Ctx = { params: Promise<{ orgId: string }> };

/** GET /api/organizations/:orgId/members — directory with HR + hierarchy fields. */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: members, error: qErr } = await supabase
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (qErr) return error(qErr.message, 500);

  const [{ data: profiles }, { data: departments }, { data: teams }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url, phone"),
    supabase.from("departments").select("id, name").eq("org_id", orgId),
    supabase.from("teams").select("id, name").eq("org_id", orgId),
  ]);
  const pById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const dById = new Map((departments ?? []).map((d) => [d.id, d]));
  const tById = new Map((teams ?? []).map((t) => [t.id, t]));

  const rows = (members ?? []).map((m) => ({
    ...m,
    profile: pById.get(m.user_id) ?? null,
    reportingOfficer: m.reporting_officer_id ? pById.get(m.reporting_officer_id) ?? null : null,
    department: m.department_id ? dById.get(m.department_id) ?? null : null,
    team: m.team_id ? tById.get(m.team_id) ?? null : null,
  })) as unknown as MemberDirectoryRow[];
  return json({ members: rows });
}

/** PATCH /api/organizations/:orgId/members?userId=… — change a member's role. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const targetUserId = new URL(request.url).searchParams.get("userId");
  if (!targetUserId) return error("userId is required", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return error("Invalid role", 422);

  // A role can only be assigned to someone who has joined the org (i.e. accepted
  // their invitation). Guard explicitly so the caller gets a clear reason rather
  // than a generic "not permitted".
  const { data: existing } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!existing) {
    return error(
      "This person hasn't joined yet. They must accept their invitation before a role can be assigned.",
      409,
    );
  }

  const { data, error: uErr } = await supabase
    .from("org_members")
    .update({ role: parsed.data.role })
    .eq("org_id", orgId)
    .eq("user_id", targetUserId)
    .select("id, role")
    .maybeSingle();

  if (uErr) return error(uErr.message, 403);
  if (!data) return error("You don't have permission to change this member's role", 403);
  return json({ member: data });
}

/** DELETE /api/organizations/:orgId/members?userId=… — remove a member. */
export async function DELETE(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const targetUserId = new URL(request.url).searchParams.get("userId");
  if (!targetUserId) return error("userId is required", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { error: dErr } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", targetUserId);

  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
