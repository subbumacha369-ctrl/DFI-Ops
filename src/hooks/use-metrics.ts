"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { OrgMetrics, MetricsFilters, DrillRow } from "@/services/metrics";

function toParams(orgId: string, f: Partial<MetricsFilters> = {}) {
  const p = new URLSearchParams({ orgId });
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, String(v));
  return p;
}

export function useMetrics(orgId: string | undefined, filters: Partial<MetricsFilters> = {}) {
  return useQuery({
    queryKey: ["metrics", orgId, filters],
    enabled: !!orgId,
    queryFn: () => apiFetch<{ metrics: OrgMetrics }>(`/api/metrics?${toParams(orgId!, filters)}`).then((r) => r.metrics),
  });
}

/** Fetch the underlying rows for a clicked dashboard widget (drill-down). */
export function useDrilldown(orgId: string) {
  return useMutation({
    mutationFn: ({ bucket, ...filters }: { bucket: string; userId?: string } & Partial<MetricsFilters>) => {
      const p = toParams(orgId, filters);
      p.set("bucket", bucket);
      if ("userId" in filters && (filters as { userId?: string }).userId) p.set("userId", (filters as { userId?: string }).userId!);
      return apiFetch<{ title: string; rows: DrillRow[] }>(`/api/metrics/drilldown?${p}`);
    },
  });
}
