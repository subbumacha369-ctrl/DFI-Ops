"use client";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { AppRole } from "@/types";
import type { ModuleKey, ActionKey } from "@/lib/rbac";

type Access = { appRole: AppRole | null; modules: Record<string, string[]>; hidden: string[] };

/**
 * The current user's effective access in an org: role, module→actions grant map,
 * and hidden feature keys. Drives sidebar visibility and dashboard personalization.
 */
export function useAccess(orgId: string | undefined) {
  const q = useQuery({
    queryKey: ["access", orgId],
    enabled: !!orgId,
    staleTime: 15_000,
    queryFn: () => apiFetch<Access>(`/api/organizations/${orgId}/access`),
  });
  const data = q.data;
  return {
    ...q,
    appRole: data?.appRole ?? null,
    can: (module: ModuleKey, action: ActionKey = "view") => !!data?.modules?.[module]?.includes(action),
    isVisible: (featureKey: string) => !(data?.hidden ?? []).includes(featureKey),
    // While loading, default to visible so nav never flickers empty.
    ready: !q.isLoading,
  };
}
