"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { Capture, WorkDraft, Extraction } from "@/types";
import type { CreateCaptureInput } from "@/lib/validations/capture";

export function useCaptures(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["captures", workspaceId],
    enabled: !!workspaceId,
    queryFn: () =>
      apiFetch<{ captures: Capture[] }>(`/api/captures?workspaceId=${workspaceId}`).then((r) => r.captures),
  });
}

export function useCapture(captureId: string | undefined) {
  return useQuery({
    queryKey: ["capture", captureId],
    enabled: !!captureId,
    queryFn: () =>
      apiFetch<{ capture: Capture; extraction: Extraction | null; drafts: WorkDraft[] }>(`/api/captures/${captureId}`),
  });
}

export function useCreateCapture(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateCaptureInput, "workspaceId">) =>
      apiFetch<{ captureId: string; summary: string; decisions: string[]; draftCount: number }>(
        "/api/captures",
        { method: "POST", body: JSON.stringify({ workspaceId, ...input }) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["captures", workspaceId] }),
  });
}

export function useConfirmDraft(captureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId, ...overrides }: { draftId: string; assignedTo?: string | null; dueDate?: string | null }) =>
      apiFetch(`/api/work-drafts/${draftId}/confirm`, { method: "POST", body: JSON.stringify(overrides) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["capture", captureId] }),
  });
}

export function useRejectDraft(captureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) =>
      apiFetch(`/api/work-drafts/${draftId}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["capture", captureId] }),
  });
}
