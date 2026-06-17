import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { updateOrganizationSchema } from "@/lib/validations/organization";

type Ctx = { params: Promise<{ orgId: string }> };

/** GET /api/organizations/:orgId — org detail (RLS limits this to members). */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (qErr) return error(qErr.message, 500);
  if (!data) return notFound("Organization");
  return json({ organization: data });
}

/** PATCH /api/organizations/:orgId — update settings (RLS limits to admins). */
export async function PATCH(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid update", 422, parsed.error.flatten());
  }

  const { data, error: uErr } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", orgId)
    .select("*")
    .maybeSingle();

  if (uErr) return error(uErr.message, 403);
  if (!data) return error("Update not permitted", 403);
  return json({ organization: data });
}
