import { getAuth, callerCan } from "@/lib/auth-route";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { createDepartmentSchema } from "@/lib/validations/member";

type Ctx = { params: Promise<{ orgId: string }> };

/** GET /api/organizations/:orgId/departments */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();
  const { data, error: qErr } = await supabase
    .from("departments").select("*").eq("org_id", orgId).order("name");
  if (qErr) return error(qErr.message, 500);
  return json({ departments: data ?? [] });
}

/** POST /api/organizations/:orgId/departments */
export async function POST(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();
  if (!(await callerCan(supabase, orgId, user.id, "departments.manage"))) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = createDepartmentSchema.safeParse(body);
  if (!parsed.success) return error("Invalid department", 422);

  const { data, error: iErr } = await supabase
    .from("departments").insert({ org_id: orgId, name: parsed.data.name, parent_id: parsed.data.parentId ?? null })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  return json({ department: data }, { status: 201 });
}
