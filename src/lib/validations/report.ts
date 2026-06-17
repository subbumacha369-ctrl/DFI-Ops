import { z } from "zod";

export const reportType = z.enum(["weekly", "monthly", "custom"]);

export const createReportSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: reportType,
  workspaceId: z.string().uuid().nullable().optional(),
  scope: z
    .object({
      workspaceId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      kind: z.enum(["org", "workspace", "project", "team"]).optional(),
    })
    .default({}),
  recipients: z.array(z.string().email()).default([]),
});

export const generateRunSchema = z.object({
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
