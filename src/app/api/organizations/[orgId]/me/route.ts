import { getAuth } from "@/lib/auth-route";
import { json, unauthorized } from "@/lib/api";
import { ROLE_PERMISSIONS } from "@/lib/rbac";
import type { AppRole } from "@/types";

type Ctx = { params: Promise<{ orgId: string }> };

/** GET /api/organizations/:orgId/me — the caller's membership, role, and permissions. */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: member } = await supabase
    .from("org_members").select("*").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();

  const appRole = (member?.app_role as AppRole | undefined) ?? null;
  const permissions = appRole === "super_admin"
    ? ["*"]
    : appRole ? ROLE_PERMISSIONS[appRole] : [];

  return json({
    userId: user.id,
    appRole,
    role: member?.role ?? null,
    status: member?.status ?? null,
    permissions,
  });
}
