"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { OrgWithRole } from "@/types";

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () =>
      apiFetch<{ organizations: OrgWithRole[] }>("/api/organizations").then(
        (r) => r.organizations,
      ),
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; timezone: string }) =>
      apiFetch<{ orgId: string; slug: string; workspaceId: string }>(
        "/api/organizations",
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations"] }),
  });
}
