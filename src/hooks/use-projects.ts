"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { Project, ProjectWithStats, Milestone, PersonLite } from "@/types";
import type { CreateProjectInput, UpdateProjectInput, CreateMilestoneInput } from "@/lib/validations/project";

export function useProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["projects", workspaceId],
    enabled: !!workspaceId,
    queryFn: () =>
      apiFetch<{ projects: ProjectWithStats[] }>(`/api/projects?workspaceId=${workspaceId}`).then((r) => r.projects),
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    enabled: !!projectId,
    queryFn: () =>
      apiFetch<{
        project: Project;
        milestones: Milestone[];
        members: (PersonLite & { role: string; user_id: string; profile: PersonLite | null })[];
        progress: { total: number; done: number; rate: number };
      }>(`/api/projects/${projectId}`),
  });
}

export function useCreateProject(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateProjectInput, "workspaceId">) =>
      apiFetch<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify({ workspaceId, ...input }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", workspaceId] }),
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateProjectInput) =>
      apiFetch<{ project: Project }>(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => apiFetch(`/api/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useCreateMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) =>
      apiFetch<{ milestone: Milestone }>(`/api/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });
}

export function useUpdateMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, ...patch }: { milestoneId: string; status?: string; name?: string }) =>
      apiFetch(`/api/projects/${projectId}/milestones/${milestoneId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role?: string }) =>
      apiFetch(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });
}
