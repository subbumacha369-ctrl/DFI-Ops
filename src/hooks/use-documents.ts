"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { Document, DocumentCategory } from "@/types";
import type { CreateDocumentInput, UpdateDocumentInput } from "@/lib/validations/document";

export function useDocuments(workspaceId: string | undefined, type?: string) {
  return useQuery({
    queryKey: ["documents", workspaceId, type],
    enabled: !!workspaceId,
    queryFn: () =>
      apiFetch<{ documents: Document[] }>(
        `/api/documents?workspaceId=${workspaceId}${type ? `&type=${type}` : ""}`,
      ).then((r) => r.documents),
  });
}

export function useDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ["document", documentId],
    enabled: !!documentId,
    queryFn: () =>
      apiFetch<{
        document: Document;
        body: string;
        versions: { id: string; version_no: number; created_at: string }[];
      }>(`/api/documents/${documentId}`),
  });
}

export function useCreateDocument(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateDocumentInput, "workspaceId">) =>
      apiFetch<{ document: Document }>("/api/documents", { method: "POST", body: JSON.stringify({ workspaceId, ...input }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", workspaceId] }),
  });
}

export function useUpdateDocument(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateDocumentInput) =>
      apiFetch<{ document: Document }>(`/api/documents/${documentId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", documentId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => apiFetch(`/api/documents/${documentId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useCategories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["doc-categories", workspaceId],
    enabled: !!workspaceId,
    queryFn: () =>
      apiFetch<{ categories: DocumentCategory[] }>(`/api/document-categories?workspaceId=${workspaceId}`).then((r) => r.categories),
  });
}

export type SearchResult = { id: string; title: string; type: string; snippet: string };

export function useDocSearch(workspaceId: string) {
  return useMutation({
    mutationFn: ({ q, ai }: { q: string; ai?: boolean }) =>
      apiFetch<{ mode: string; answer?: string; results: SearchResult[] }>(
        `/api/documents/search?workspaceId=${workspaceId}&q=${encodeURIComponent(q)}${ai ? "&ai=1" : ""}`,
      ),
  });
}
