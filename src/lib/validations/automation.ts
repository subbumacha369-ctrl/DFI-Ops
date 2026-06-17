import { z } from "zod";

export const triggerType = z.enum([
  "task_created", "task_status_changed", "task_due_soon", "task_overdue",
  "comment_added", "mentioned", "capture_processed", "schedule",
]);

export const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["eq", "neq", "gt", "lt", "contains"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const actionSchema = z.object({
  actionType: z.enum(["assign", "set_status", "set_priority", "notify", "create_followup"]),
  params: z.record(z.string(), z.unknown()).default({}),
});

export const createRuleSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  triggerType,
  trigger: z.record(z.string(), z.unknown()).default({}),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1, "Add at least one action"),
  enabled: z.boolean().default(true),
});

export const updateRuleSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  triggerType: triggerType.optional(),
  trigger: z.record(z.string(), z.unknown()).optional(),
  conditions: z.array(conditionSchema).optional(),
  enabled: z.boolean().optional(),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
