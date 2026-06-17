"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { ReportDefinition, ReportRun } from "@/types";
import type { CreateReportInput } from "@/lib/validations/report";

export type ReportWithLastRun = ReportDefinition & { lastRun: ReportRun | null };

export function useReports(orgId: string | undefined) {
  return useQuery({
    queryKey: ["reports", orgId],
    enabled: !!orgId,
    queryFn: () =>
      apiFetch<{ reports: ReportWithLastRun[] }>(`/api/reports?orgId=${orgId}`).then((r) => r.reports),
  });
}

export function useReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ["report", reportId],
    enabled: !!reportId,
    queryFn: () =>
      apiFetch<{ report: ReportDefinition; runs: ReportRun[] }>(`/api/reports/${reportId}`),
  });
}

export function useCreateReport(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportInput) =>
      apiFetch<{ report: ReportDefinition }>("/api/reports", { method: "POST", body: JSON.stringify({ orgId, ...input }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", orgId] }),
  });
}

export function useGenerateReport(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) =>
      apiFetch<{ run: ReportRun }>(`/api/reports/${reportId}/runs`, { method: "POST" }),
    onSuccess: (_d, reportId) => {
      qc.invalidateQueries({ queryKey: ["reports", orgId] });
      qc.invalidateQueries({ queryKey: ["report", reportId] });
    },
  });
}

export function useDeleteReport(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => apiFetch(`/api/reports/${reportId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", orgId] }),
  });
}
