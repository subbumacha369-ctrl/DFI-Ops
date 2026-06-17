"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { AutomationRule, AutomationAction } from "@/types";
import type { CreateRuleInput } from "@/lib/validations/automation";

export type RuleWithActions = AutomationRule & { actions: AutomationAction[] };

export function useAutomations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["automations", workspaceId],
    enabled: !!workspaceId,
    queryFn: () =>
      apiFetch<{ rules: RuleWithActions[] }>(`/api/automations?workspaceId=${workspaceId}`).then((r) => r.rules),
  });
}

export function useCreateAutomation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateRuleInput, "workspaceId">) =>
      apiFetch<{ rule: AutomationRule }>("/api/automations", { method: "POST", body: JSON.stringify({ workspaceId, ...input }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", workspaceId] }),
  });
}

export function useToggleAutomation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) =>
      apiFetch(`/api/automations/${ruleId}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", workspaceId] }),
  });
}

export function useDeleteAutomation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => apiFetch(`/api/automations/${ruleId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", workspaceId] }),
  });
}

export function useRunAutomation() {
  return useMutation({
    mutationFn: (ruleId: string) =>
      apiFetch<{ matched: number; result: string }>(`/api/automations/${ruleId}/run`, { method: "POST" }),
  });
}
