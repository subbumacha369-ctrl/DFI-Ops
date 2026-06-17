import { getAuth, loadAppRole } from "@/lib/auth-route";
import { json, error, unauthorized, notFound, forbidden } from "@/lib/api";
import { updateMemberSchema } from "@/lib/validations/member";
import { can, assignableRoles } from "@/lib/rbac";
import { logActivity } from "@/services/activity";
import type { Database } from "@/types/database.types";
import type { PersonLite } from "@/types";

type Ctx = { params: Promise<{ orgId: string; userId: string }> };
type MemberUpdate = Database["public"]["Tables"]["org_members"]["Update"];

/** GET /api/organizations/:orgId/members/:userId — member detail + direct reports. */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId, userId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: member } = await supabase
    .from("org_members").select("*").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  if (!member) return notFound("Member");

  const [{ data: profile }, { data: dept }, { data: team }, { data: officer }, { data: reports }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url, phone").eq("id", userId).maybeSingle(),
    member.department_id ? supabase.from("departments").select("id, name").eq("id", member.department_id).maybeSingle() : Promise.resolve({ data: null }),
    member.team_id ? supabase.from("teams").select("id, name").eq("id", member.team_id).maybeSingle() : Promise.resolve({ data: null }),
    member.reporting_officer_id ? supabase.from("profiles").select("id, full_name, email").eq("id", member.reporting_officer_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("org_members").select("user_id").eq("org_id", orgId).eq("reporting_officer_id", userId),
  ]);

  const reportIds = (reports ?? []).map((r) => r.user_id);
  const { data: reportProfiles } = reportIds.length
    ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", reportIds)
    : { data: [] };

  return json({
    member: { ...member, profile: profile as PersonLite, department: dept, team, reportingOfficer: officer },
    directReports: (reportProfiles ?? []) as PersonLite[],
  });
}

/** PATCH /api/organizations/:orgId/members/:userId — update HR / RBAC fields. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { orgId, userId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) return error("Invalid member update", 422, parsed.error.flatten());
  const d = parsed.data;

  const callerRole = await loadAppRole(supabase, orgId, user.id);
  const changesRbac = d.appRole !== undefined || d.role !== undefined || d.status !== undefined;
  const changesHr = d.employeeId !== undefined || d.designation !== undefined;
  const changesAssignment = d.departmentId !== undefined || d.teamId !== undefined || d.reportingOfficerId !== undefined || d.joinDate !== undefined;

  if ((changesRbac || changesHr) && !can(callerRole, "members.manage")) return forbidden();
  if (changesAssignment && !can(callerRole, "members.manage") && !can(callerRole, "team.manage")) return forbidden();
  if (d.appRole && !assignableRoles(callerRole).includes(d.appRole)) {
    return error("You cannot assign a role at or above your own level", 403);
  }

  const patch: MemberUpdate = {};
  if (d.role !== undefined) patch.role = d.role;
  if (d.appRole !== undefined) patch.app_role = d.appRole;
  if (d.status !== undefined) patch.status = d.status;
  if (d.employeeId !== undefined) patch.employee_id = d.employeeId;
  if (d.designation !== undefined) patch.designation = d.designation;
  if (d.departmentId !== undefined) patch.department_id = d.departmentId;
  if (d.teamId !== undefined) patch.team_id = d.teamId;
  if (d.reportingOfficerId !== undefined) patch.reporting_officer_id = d.reportingOfficerId;
  if (d.joinDate !== undefined) patch.join_date = d.joinDate;
  if (Object.keys(patch).length === 0) return error("No fields to update", 422);

  const { data, error: uErr } = await supabase
    .from("org_members").update(patch).eq("org_id", orgId).eq("user_id", userId).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  if (!data) return error("Update not permitted", 403);

  await logActivity(supabase, {
    orgId, actorId: user.id, verb: "updated", objectType: "member", objectId: userId,
    metadata: { fields: Object.keys(patch) },
  });
  return json({ member: data });
}

/** DELETE /api/organizations/:orgId/members/:userId — remove a member. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { orgId, userId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  if (!(await loadAppRole(supabase, orgId, user.id).then((r) => can(r, "members.manage")))) return forbidden();
  const { error: dErr } = await supabase.from("org_members").delete().eq("org_id", orgId).eq("user_id", userId);
  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
