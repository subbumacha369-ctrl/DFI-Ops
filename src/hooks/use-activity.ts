"use client";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { ActivityEvent, PersonLite } from "@/types";

export type ActivityWithActor = ActivityEvent & { actor: PersonLite | null };

export function useActivity(orgId: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: ["activity", orgId, workspaceId],
    enabled: !!orgId,
    queryFn: () =>
      apiFetch<{ events: ActivityWithActor[] }>(
        `/api/activity?orgId=${orgId}${workspaceId ? `&workspaceId=${workspaceId}` : ""}`,
      ).then((r) => r.events),
  });
}
