"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { Task, TaskWithRelations, TaskStatus, CommentWithAuthor } from "@/types";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validations/task";

export type TaskFilters = {
  projectId?: string;
  assignedTo?: string;
  statusId?: string;
  parentTaskId?: string;
  topLevel?: boolean;
};

function qs(workspaceId: string, f: TaskFilters = {}) {
  const p = new URLSearchParams({ workspaceId });
  if (f.projectId) p.set("projectId", f.projectId);
  if (f.assignedTo) p.set("assignedTo", f.assignedTo);
  if (f.statusId) p.set("statusId", f.statusId);
  if (f.parentTaskId) p.set("parentTaskId", f.parentTaskId);
  if (f.topLevel) p.set("topLevel", "1");
  return p.toString();
}

export function useTaskStatuses(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["task-statuses", workspaceId],
    enabled: !!workspaceId,
    queryFn: () =>
      apiFetch<{ statuses: TaskStatus[] }>(`/api/task-statuses?workspaceId=${workspaceId}`).then((r) => r.statuses),
  });
}

export function useTasks(workspaceId: string | undefined, filters?: TaskFilters) {
  return useQuery({
    queryKey: ["tasks", workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: () =>
      apiFetch<{ tasks: TaskWithRelations[] }>(`/api/tasks?${qs(workspaceId!, filters)}`).then((r) => r.tasks),
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task", taskId],
    enabled: !!taskId,
    queryFn: () =>
      apiFetch<{
        task: TaskWithRelations;
        dependencies: { id: string; depends_on_id: string; type: string }[];
        subtasks: { id: string; title: string; status_id: string; completed_at: string | null }[];
        tagIds: string[];
      }>(`/api/tasks/${taskId}`),
  });
}

export function useCreateTask(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateTaskInput, "workspaceId">) =>
      apiFetch<{ task: Task }>("/api/tasks", { method: "POST", body: JSON.stringify({ workspaceId, ...input }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
}

export function useUpdateTask(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...patch }: UpdateTaskInput & { taskId: string }) =>
      apiFetch<{ task: Task }>(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      qc.invalidateQueries({ queryKey: ["task", v.taskId] });
    },
  });
}

export function useDeleteTask(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    enabled: !!taskId,
    queryFn: () =>
      apiFetch<{ comments: CommentWithAuthor[] }>(`/api/tasks/${taskId}/comments`).then((r) => r.comments),
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; mentions?: string[] }) =>
      apiFetch(`/api/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-comments", taskId] }),
  });
}
