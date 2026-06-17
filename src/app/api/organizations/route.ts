import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized, tooMany } from "@/lib/api";
import { checkLimit, writeRatelimit } from "@/lib/redis";
import { createOrganizationSchema } from "@/lib/validations/organization";
import type { OrgWithRole } from "@/types";

/** POST /api/organizations — create an org (+ owner, default workspace, statuses). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { success } = await checkLimit(writeRatelimit, `org-create:${user.id}`);
  if (!success) return tooMany();

  const body = await request.json().catch(() => null);
  const parsed = createOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid organization details", 422, parsed.error.flatten());
  }

  const { data, error: rpcError } = await supabase
    .rpc("create_organization", {
      p_name: parsed.data.name,
      p_timezone: parsed.data.timezone,
    })
    .single();

  if (rpcError || !data) {
    return error(rpcError?.message ?? "Could not create organization", 500);
  }

  return json(
    { orgId: data.org_id, slug: data.org_slug, workspaceId: data.workspace_id },
    { status: 201 },
  );
}

/** GET /api/organizations — list orgs the current user belongs to, with role. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("org_members")
    .select("role, organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (qErr) return error(qErr.message, 500);

  const orgs: OrgWithRole[] = (data ?? [])
    .filter((row) => row.organizations)
    .map((row) => ({
      ...(row.organizations as unknown as OrgWithRole),
      role: row.role,
    }));

  return json({ organizations: orgs });
}
