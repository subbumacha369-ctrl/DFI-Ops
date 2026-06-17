"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { OrgRole } from "@/types";

type Invitation = {
  id: string;
  email: string;
  role: OrgRole;
  status: string;
  expires_at: string;
  created_at: string;
};

export function useInvitations(orgId: string) {
  return useQuery({
    queryKey: ["invitations", orgId],
    queryFn: () =>
      apiFetch<{ invitations: Invitation[] }>(
        `/api/organizations/${orgId}/invitations`,
      ).then((r) => r.invitations),
  });
}

export function useInviteMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: OrgRole }) =>
      apiFetch<{ emailSent: boolean }>(
        `/api/organizations/${orgId}/invitations`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", orgId] }),
  });
}

export function useRevokeInvitation(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/organizations/${orgId}/invitations?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", orgId] }),
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<{ orgId: string; slug: string }>("/api/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
  });
}
