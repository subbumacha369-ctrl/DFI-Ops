"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { MemberWithProfile, OrgRole } from "@/types";

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: ["members", orgId],
    queryFn: () =>
      apiFetch<{ members: MemberWithProfile[] }>(
        `/api/organizations/${orgId}/members`,
      ).then((r) => r.members),
  });
}

export function useUpdateMemberRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: OrgRole }) =>
      apiFetch(`/api/organizations/${orgId}/members?userId=${input.userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: input.role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
  });
}

export function useRemoveMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/organizations/${orgId}/members?userId=${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
  });
}
