import { z } from "zod";

export const createProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  description: z.string().max(5_000).optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).default("active"),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(5_000).nullable().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
});

export const createMilestoneSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2_000).optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateMilestoneSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(2_000).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["open", "completed"]).optional(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["lead", "member"]).default("member"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
