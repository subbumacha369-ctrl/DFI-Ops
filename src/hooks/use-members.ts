"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { MemberDirectoryRow, Department, Team, PersonLite, AppRole, MemberStatus } from "@/types";
import type { UpdateMemberInput, UpdateProfileInput } from "@/lib/validations/member";

export function useMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["members", orgId],
    enabled: !!orgId,
    queryFn: () =>
      apiFetch<{ members: MemberDirectoryRow[] }>(`/api/organizations/${orgId}/members`).then((r) => r.members),
  });
}

export function useMember(orgId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["member", orgId, userId],
    enabled: !!orgId && !!userId,
    queryFn: () =>
      apiFetch<{ member: MemberDirectoryRow & { directReports?: PersonLite[] }; directReports: PersonLite[] }>(
        `/api/organizations/${orgId}/members/${userId}`,
      ),
  });
}

export function useUpdateMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...patch }: UpdateMemberInput & { userId: string }) =>
      apiFetch(`/api/organizations/${orgId}/members/${userId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["members", orgId] });
      qc.invalidateQueries({ queryKey: ["member", orgId, v.userId] });
    },
  });
}

export function useRemoveMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/organizations/${orgId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
  });
}

export function useSetMemberStatus(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: MemberStatus }) =>
      apiFetch(`/api/organizations/${orgId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
  });
}

export function useSetMemberRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, appRole }: { userId: string; appRole: AppRole }) =>
      apiFetch(`/api/organizations/${orgId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ appRole }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
  });
}

export function useDepartments(orgId: string | undefined) {
  return useQuery({
    queryKey: ["departments", orgId],
    enabled: !!orgId,
    queryFn: () => apiFetch<{ departments: Department[] }>(`/api/organizations/${orgId}/departments`).then((r) => r.departments),
  });
}

export function useTeams(orgId: string | undefined) {
  return useQuery({
    queryKey: ["teams", orgId],
    enabled: !!orgId,
    queryFn: () => apiFetch<{ teams: Team[] }>(`/api/organizations/${orgId}/teams`).then((r) => r.teams),
  });
}

export function useCreateDepartment(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch(`/api/organizations/${orgId}/departments`, { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", orgId] }),
  });
}

export function useCreateTeam(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, departmentId }: { name: string; departmentId?: string }) =>
      apiFetch(`/api/organizations/${orgId}/teams`, { method: "POST", body: JSON.stringify({ name, departmentId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams", orgId] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch("/api/profile", { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user"] }),
  });
}
