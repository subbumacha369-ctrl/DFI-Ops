"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { AppRole, PersonLite } from "@/types";
import type { PermOverride, VisibilityOverride } from "@/lib/rbac";

type MatrixResp = {
  effective: Record<string, Record<string, Record<string, boolean>>>;
  overrides: PermOverride[];
  modules: { key: string; label: string }[];
  actions: readonly string[];
  roles: AppRole[];
};

export function usePermissionMatrix(orgId: string | undefined) {
  return useQuery({
    queryKey: ["permission-matrix", orgId],
    enabled: !!orgId,
    queryFn: () => apiFetch<MatrixResp>(`/api/organizations/${orgId}/permission-matrix`),
  });
}

export function useSetPermission(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { appRole: AppRole; module: string; action: string; allowed: boolean }) =>
      apiFetch(`/api/organizations/${orgId}/permission-matrix`, { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-matrix", orgId] });
      qc.invalidateQueries({ queryKey: ["access", orgId] });
      qc.invalidateQueries({ queryKey: ["audit", orgId] });
    },
  });
}

type VisResp = {
  hidden: Record<string, string[]>;
  overrides: VisibilityOverride[];
  features: { key: string; label: string; group: string }[];
  roles: AppRole[];
};

export function useVisibility(orgId: string | undefined) {
  return useQuery({
    queryKey: ["visibility", orgId],
    enabled: !!orgId,
    queryFn: () => apiFetch<VisResp>(`/api/organizations/${orgId}/visibility`),
  });
}

export function useSetVisibility(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { appRole: AppRole; featureKey: string; hidden: boolean }) =>
      apiFetch(`/api/organizations/${orgId}/visibility`, { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visibility", orgId] });
      qc.invalidateQueries({ queryKey: ["access", orgId] });
      qc.invalidateQueries({ queryKey: ["audit", orgId] });
    },
  });
}

export type AuditRow = {
  id: string; action: string; entity_type: string; entity_id: string | null;
  before: unknown; after: unknown; created_at: string; actor: PersonLite | null;
};

export function useAudit(orgId: string | undefined) {
  return useQuery({
    queryKey: ["audit", orgId],
    enabled: !!orgId,
    queryFn: () => apiFetch<{ events: AuditRow[] }>(`/api/organizations/${orgId}/audit`).then((r) => r.events),
  });
}
