import { describe, it, expect } from "vitest";
import { createTaskSchema, createCommentSchema } from "@/lib/validations/task";
import { createProjectSchema, createMilestoneSchema } from "@/lib/validations/project";
import { createDocumentSchema } from "@/lib/validations/document";
import { createCaptureSchema } from "@/lib/validations/capture";
import { createRuleSchema } from "@/lib/validations/automation";
import { createReportSchema } from "@/lib/validations/report";

const uuid = "00000000-0000-0000-0000-000000000000";

describe("task validation", () => {
  it("requires a workspace and a 2+ char title", () => {
    expect(createTaskSchema.safeParse({ workspaceId: uuid, title: "Do the thing" }).success).toBe(true);
    expect(createTaskSchema.safeParse({ workspaceId: uuid, title: "x" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ workspaceId: "nope", title: "valid title" }).success).toBe(false);
  });
  it("defaults priority to medium", () => {
    const r = createTaskSchema.parse({ workspaceId: uuid, title: "A task" });
    expect(r.priority).toBe("medium");
  });
  it("rejects empty comments", () => {
    expect(createCommentSchema.safeParse({ body: "" }).success).toBe(false);
    expect(createCommentSchema.safeParse({ body: "hi" }).success).toBe(true);
  });
});

describe("project validation", () => {
  it("validates names and milestone names", () => {
    expect(createProjectSchema.safeParse({ workspaceId: uuid, name: "Launch" }).success).toBe(true);
    expect(createMilestoneSchema.safeParse({ name: "Beta" }).success).toBe(true);
    expect(createMilestoneSchema.safeParse({ name: "B" }).success).toBe(false);
  });
});

describe("document + capture validation", () => {
  it("validates documents and captures", () => {
    expect(createDocumentSchema.safeParse({ workspaceId: uuid, title: "Runbook" }).success).toBe(true);
    expect(createCaptureSchema.safeParse({ workspaceId: uuid, sourceType: "meeting", rawText: "notes" }).success).toBe(true);
    expect(createCaptureSchema.safeParse({ workspaceId: uuid, sourceType: "bogus", rawText: "x" }).success).toBe(false);
  });
});

describe("automation + report validation", () => {
  it("requires at least one action on a rule", () => {
    expect(
      createRuleSchema.safeParse({ workspaceId: uuid, name: "Overdue", triggerType: "task_overdue", actions: [] }).success,
    ).toBe(false);
    expect(
      createRuleSchema.safeParse({
        workspaceId: uuid, name: "Overdue", triggerType: "task_overdue",
        actions: [{ actionType: "notify", params: {} }],
      }).success,
    ).toBe(true);
  });
  it("validates report type", () => {
    expect(createReportSchema.safeParse({ name: "Weekly ops", type: "weekly" }).success).toBe(true);
    expect(createReportSchema.safeParse({ name: "X", type: "annual" }).success).toBe(false);
  });
});
