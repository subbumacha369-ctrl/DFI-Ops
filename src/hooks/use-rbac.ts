"use client";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import { can as canFn, type Permission } from "@/lib/rbac";
import type { AppRole, MemberStatus } from "@/types";

type Me = { userId: string; appRole: AppRole | null; role: string | null; status: MemberStatus | null; permissions: string[] };

/** Current user's role + permissions in the org, with a `can()` checker. */
export function useMyRole(orgId: string | undefined) {
  const q = useQuery({
    queryKey: ["me-role", orgId],
    enabled: !!orgId,
    queryFn: () => apiFetch<Me>(`/api/organizations/${orgId}/me`),
  });
  const appRole = q.data?.appRole ?? null;
  return {
    ...q,
    appRole,
    can: (perm: Permission) => canFn(appRole, perm),
  };
}
