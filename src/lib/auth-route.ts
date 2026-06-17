import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/rbac";
import type { AppRole } from "@/types";

/** Resolve the request's Supabase client and authenticated user (or null). */
export async function getAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** The caller's functional (RBAC) role in an org, or null if not a member. */
export async function loadAppRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
): Promise<AppRole | null> {
  const { data } = await supabase
    .from("org_members")
    .select("app_role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.app_role as AppRole | undefined) ?? null;
}

/** True if the caller holds the permission in the org. */
export async function callerCan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
  perm: Permission,
): Promise<boolean> {
  return can(await loadAppRole(supabase, orgId, userId), perm);
}

/**
 * Look up a workspace's org_id (RLS-scoped — returns null if the caller is not a
 * member). Lets routes accept a workspaceId and derive org_id server-side.
 */
export async function resolveWorkspaceOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("workspaces")
    .select("org_id")
    .eq("id", workspaceId)
    .maybeSingle();
  return data?.org_id ?? null;
}
