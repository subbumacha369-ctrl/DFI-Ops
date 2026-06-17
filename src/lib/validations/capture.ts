import { z } from "zod";

export const captureSourceType = z.enum([
  "meeting", "voice", "document", "chat", "project_update", "nl",
]);

export const createCaptureSchema = z.object({
  workspaceId: z.string().uuid(),
  sourceType: captureSourceType,
  title: z.string().trim().max(200).optional(),
  rawText: z.string().trim().min(1, "Provide some content to process").max(100_000),
});

export const confirmDraftSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(10_000).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;
export type ConfirmDraftInput = z.infer<typeof confirmDraftSchema>;
