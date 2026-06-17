import { z } from "zod";

export const createWorkspaceSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  icon: z.string().max(8).optional(),
  description: z.string().max(500).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  icon: z.string().max(8).optional(),
  description: z.string().max(500).optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
