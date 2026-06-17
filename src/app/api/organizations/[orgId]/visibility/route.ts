import { getAuth, callerCan } from "@/lib/auth-route";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { logAudit } from "@/services/audit";
import { FEATURES, ROLE_ORDER, isFeatureVisible, type VisibilityOverride } from "@/lib/rbac";
import type { Database } from "@/types/database.types";
import type { AppRole } from "@/types";

type Ctx = { params: Promise<{ orgId: string }> };

/** GET — effective hidden map per role + feature catalog. */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: overrides } = await supabase
    .from("feature_visibility").select("app_role, feature_key, hidden").eq("org_id", orgId);
  const ov = (overrides ?? []) as VisibilityOverride[];

  const hidden: Record<string, string[]> = {};
  for (const role of ROLE_ORDER) {
    hidden[role] = FEATURES.map((f) => f.key).filter((k) => !isFeatureVisible(role, k, ov));
  }
  return json({ hidden, overrides: ov, features: FEATURES, roles: ROLE_ORDER });
}

/** PUT — set visibility { appRole, featureKey, hidden } (+ audit). */
export async function PUT(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();
  if (!(await callerCan(supabase, orgId, user.id, "permissions.manage"))) return forbidden();

  const body = await request.json().catch(() => null);
  const appRole = body?.appRole as AppRole | undefined;
  const featureKey = body?.featureKey as string | undefined;
  const hidden = !!body?.hidden;
  if (!appRole || !featureKey) return error("appRole and featureKey required", 422);
  if (appRole === "super_admin") return error("Super Admin visibility cannot be changed", 422);

  const row: Database["public"]["Tables"]["feature_visibility"]["Insert"] = {
    org_id: orgId, app_role: appRole, feature_key: featureKey, hidden, updated_by: user.id,
  };
  const { data, error: uErr } = await supabase
    .from("feature_visibility").upsert(row, { onConflict: "org_id,app_role,feature_key" }).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);

  await logAudit(supabase, {
    orgId, actorId: user.id, action: "visibility.changed", entityType: "feature_visibility", entityId: data?.id ?? null,
    before: { app_role: appRole, feature_key: featureKey, hidden: !hidden },
    after: { app_role: appRole, feature_key: featureKey, hidden },
  });
  return json({ override: data });
}
