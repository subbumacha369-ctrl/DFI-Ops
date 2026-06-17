import { getAuth, callerCan } from "@/lib/auth-route";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { createTeamSchema } from "@/lib/validations/member";

type Ctx = { params: Promise<{ orgId: string }> };

/** GET /api/organizations/:orgId/teams */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();
  const { data, error: qErr } = await supabase
    .from("teams").select("*").eq("org_id", orgId).order("name");
  if (qErr) return error(qErr.message, 500);
  return json({ teams: data ?? [] });
}

/** POST /api/organizations/:orgId/teams */
export async function POST(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();
  if (!(await callerCan(supabase, orgId, user.id, "departments.manage"))) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) return error("Invalid team", 422);

  const { data, error: iErr } = await supabase
    .from("teams").insert({ org_id: orgId, name: parsed.data.name, department_id: parsed.data.departmentId ?? null })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  return json({ team: data }, { status: 201 });
}
