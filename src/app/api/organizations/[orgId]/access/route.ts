import { getAuth, loadAppRole } from "@/lib/auth-route";
import { json, unauthorized } from "@/lib/api";
import { MODULES, ACTIONS, canModule, FEATURES, isFeatureVisible, type PermOverride, type VisibilityOverride } from "@/lib/rbac";
import type { ModuleKey } from "@/lib/rbac";

type Ctx = { params: Promise<{ orgId: string }> };

/**
 * GET /api/organizations/:orgId/access — the caller's effective access:
 * their role, the granted actions per module, and the set of hidden features.
 * Drives sidebar navigation and dashboard personalization.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const appRole = await loadAppRole(supabase, orgId, user.id);

  const [{ data: perms }, { data: vis }] = await Promise.all([
    supabase.from("role_permissions").select("app_role, module, action, allowed").eq("org_id", orgId),
    supabase.from("feature_visibility").select("app_role, feature_key, hidden").eq("org_id", orgId),
  ]);
  const permOverrides = (perms ?? []) as PermOverride[];
  const visOverrides = (vis ?? []) as VisibilityOverride[];

  const modules: Record<string, string[]> = {};
  for (const m of MODULES) {
    modules[m.key] = ACTIONS.filter((a) => canModule(appRole, m.key as ModuleKey, a, permOverrides));
  }
  const hidden = FEATURES.map((f) => f.key).filter((k) => !isFeatureVisible(appRole, k, visOverrides));

  return json({ appRole, modules, hidden });
}
