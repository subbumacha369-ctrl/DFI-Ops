"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { Notification } from "@/types";

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    refetchInterval: 30_000,
    queryFn: () =>
      apiFetch<{ notifications: Notification[]; unreadCount: number }>(
        `/api/notifications${unreadOnly ? "?unread=1" : ""}`,
      ),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read = true }: { id: string; read?: boolean }) =>
      apiFetch(`/api/notifications/${id}`, { method: "PATCH", body: JSON.stringify({ read }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
