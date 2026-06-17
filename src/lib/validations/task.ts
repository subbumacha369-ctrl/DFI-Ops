import { z } from "zod";

export const taskPriority = z.enum(["low", "medium", "high", "critical"]);
export const dependencyType = z.enum(["blocks", "relates", "duplicates"]);

export const createTaskSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().max(10_000).optional(),
  priority: taskPriority.default("medium"),
  statusId: z.string().uuid().optional(),
  projectId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  recurrenceRule: z.string().max(300).nullable().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(10_000).nullable().optional(),
  priority: taskPriority.optional(),
  statusId: z.string().uuid().optional(),
  projectId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  recurrenceRule: z.string().max(300).nullable().optional(),
  position: z.number().optional(),
});

export const createDependencySchema = z.object({
  dependsOnId: z.string().uuid(),
  type: dependencyType.default("blocks"),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(10_000),
  parentCommentId: z.string().uuid().nullable().optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

export const createTemplateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  definition: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priority: taskPriority.optional(),
    subtasks: z.array(z.object({ title: z.string().min(1) })).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
