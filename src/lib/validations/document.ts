import { z } from "zod";

export const createDocumentSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200),
  type: z.enum(["doc", "sop", "policy"]).default("doc"),
  body: z.string().max(200_000).default(""),
  categoryId: z.string().uuid().nullable().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  type: z.enum(["doc", "sop", "policy"]).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  body: z.string().max(200_000).optional(),
});

export const createCategorySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  color: z.string().max(20).optional(),
});

export const searchSchema = z.object({
  workspaceId: z.string().uuid(),
  q: z.string().trim().min(1).max(300),
  ai: z.boolean().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
