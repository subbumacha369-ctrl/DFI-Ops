"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { Workspace } from "@/types";

export function useWorkspaces(orgId: string | undefined) {
  return useQuery({
    queryKey: ["workspaces", orgId],
    enabled: !!orgId,
    queryFn: () =>
      apiFetch<{ workspaces: Workspace[] }>(
        `/api/workspaces?orgId=${orgId}`,
      ).then((r) => r.workspaces),
  });
}

export function useCreateWorkspace(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; icon?: string; description?: string }) =>
      apiFetch<{ workspaceId: string }>("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ orgId, ...input }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces", orgId] }),
  });
}
