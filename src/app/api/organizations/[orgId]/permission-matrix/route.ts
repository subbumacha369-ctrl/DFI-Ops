import { getAuth, callerCan } from "@/lib/auth-route";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { logAudit } from "@/services/audit";
import { ACTIONS, MODULES, ROLE_ORDER, canModule, type PermOverride } from "@/lib/rbac";
import type { Database } from "@/types/database.types";
import type { AppRole } from "@/types";

type Ctx = { params: Promise<{ orgId: string }> };

/** GET — the full effective matrix (roles × modules × actions) + raw overrides. */
export async function GET(_request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: overrides } = await supabase
    .from("role_permissions").select("app_role, module, action, allowed").eq("org_id", orgId);
  const ov = (overrides ?? []) as PermOverride[];

  // effective[role][module][action] = boolean
  const effective: Record<string, Record<string, Record<string, boolean>>> = {};
  for (const role of ROLE_ORDER) {
    effective[role] = {};
    for (const m of MODULES) {
      effective[role][m.key] = {};
      for (const a of ACTIONS) effective[role][m.key][a] = canModule(role, m.key, a, ov);
    }
  }
  return json({ effective, overrides: ov, modules: MODULES, actions: ACTIONS, roles: ROLE_ORDER });
}

/** PUT — set a single override { appRole, module, action, allowed } (+ audit). */
export async function PUT(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();
  if (!(await callerCan(supabase, orgId, user.id, "permissions.manage"))) return forbidden();

  const body = await request.json().catch(() => null);
  const appRole = body?.appRole as AppRole | undefined;
  const moduleKey = body?.module as string | undefined;
  const action = body?.action as string | undefined;
  const allowed = !!body?.allowed;
  if (!appRole || !moduleKey || !action) return error("appRole, module, action required", 422);
  if (appRole === "super_admin") return error("Super Admin permissions cannot be edited", 422);

  const before = canModule(appRole, moduleKey as never, action as never);

  const row: Database["public"]["Tables"]["role_permissions"]["Insert"] = {
    org_id: orgId, app_role: appRole, module: moduleKey, action, allowed, updated_by: user.id,
  };
  const { data, error: uErr } = await supabase
    .from("role_permissions").upsert(row, { onConflict: "org_id,app_role,module,action" }).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);

  await logAudit(supabase, {
    orgId, actorId: user.id, action: "permission.changed", entityType: "role_permission", entityId: data?.id ?? null,
    before: { app_role: appRole, module: moduleKey, action, allowed: before },
    after: { app_role: appRole, module: moduleKey, action, allowed },
  });
  return json({ override: data });
}
