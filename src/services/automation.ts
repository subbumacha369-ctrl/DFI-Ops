import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { notify } from "@/services/notifications";
import { logActivity } from "@/services/activity";

type Client = SupabaseClient<Database>;
type Rule = Database["public"]["Tables"]["automation_rules"]["Row"];
type Action = Database["public"]["Tables"]["automation_actions"]["Row"];
type Condition = { field: string; op: string; value: unknown };

/** Apply a list of AND conditions to a task-shaped record. */
function matchesConditions(task: Record<string, unknown>, conditions: Condition[]): boolean {
  return conditions.every((c) => {
    const v = task[c.field];
    switch (c.op) {
      case "eq": return v === c.value;
      case "neq": return v !== c.value;
      case "gt": return typeof v === "number" && typeof c.value === "number" && v > c.value;
      case "lt": return typeof v === "number" && typeof c.value === "number" && v < c.value;
      case "contains": return typeof v === "string" && v.toLowerCase().includes(String(c.value).toLowerCase());
      default: return true;
    }
  });
}

/**
 * Evaluate a rule against current workspace data and run its actions.
 * Supports the data-driven triggers (overdue / due-soon); event triggers are
 * exercised here as a "run now" over the matching set. Returns affected count.
 */
export async function evaluateRule(
  client: Client,
  rule: Rule,
  actions: Action[],
  actorId: string,
): Promise<{ matched: number; result: string; error?: string }> {
  try {
    const conditions = (rule.conditions as unknown as Condition[]) ?? [];
    const now = Date.now();

    // Determine the candidate task set from the trigger.
    let q = client.from("tasks").select("*").eq("workspace_id", rule.workspace_id).is("archived_at", null).is("completed_at", null);
    if (rule.trigger_type === "task_overdue") q = q.lt("due_date", new Date(now).toISOString());
    else if (rule.trigger_type === "task_due_soon") {
      const soon = new Date(now + 2 * 86_400_000).toISOString();
      q = q.gte("due_date", new Date(now).toISOString()).lte("due_date", soon);
    }
    const { data: tasks } = await q;

    const matched = (tasks ?? []).filter((t) => matchesConditions(t as Record<string, unknown>, conditions));

    for (const task of matched) {
      for (const action of actions) {
        await runAction(client, action, task, rule, actorId);
      }
    }

    await client.from("automation_run_logs").insert({
      org_id: rule.org_id, rule_id: rule.id,
      context: { matched: matched.length } as Json, result: "success",
    });
    return { matched: matched.length, result: "success" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    await client.from("automation_run_logs").insert({
      org_id: rule.org_id, rule_id: rule.id, context: {} as Json, result: "error", error: message,
    });
    return { matched: 0, result: "error", error: message };
  }
}

async function runAction(
  client: Client,
  action: Action,
  task: Database["public"]["Tables"]["tasks"]["Row"],
  rule: Rule,
  actorId: string,
): Promise<void> {
  const params = (action.params ?? {}) as Record<string, unknown>;
  switch (action.action_type) {
    case "assign": {
      const userId = params.userId as string | undefined;
      if (userId) await client.from("tasks").update({ assigned_to: userId, assigned_by: actorId }).eq("id", task.id);
      break;
    }
    case "set_priority": {
      const priority = params.priority as "low" | "medium" | "high" | "critical" | undefined;
      if (priority) await client.from("tasks").update({ priority }).eq("id", task.id);
      break;
    }
    case "set_status": {
      const statusId = params.statusId as string | undefined;
      if (statusId) await client.from("tasks").update({ status_id: statusId }).eq("id", task.id);
      break;
    }
    case "notify": {
      const target = (params.userId as string | undefined) ?? task.assigned_to ?? task.created_by;
      if (target) {
        await notify(client, {
          orgId: rule.org_id, userId: target, type: "automation",
          title: (params.message as string | undefined) ?? `Automation: ${rule.name}`,
          body: `Task "${task.title}" matched rule "${rule.name}".`,
          url: `/w/${rule.workspace_id}/tasks?task=${task.id}`,
        });
      }
      break;
    }
    case "create_followup": {
      await client.from("tasks").insert({
        org_id: rule.org_id, workspace_id: rule.workspace_id, status_id: task.status_id,
        title: `Follow up: ${task.title}`, assigned_to: task.assigned_to, assigned_by: actorId,
        priority: task.priority, created_by: actorId,
      });
      break;
    }
  }
  await logActivity(client, {
    orgId: rule.org_id, workspaceId: rule.workspace_id, actorId, verb: "automation_ran",
    objectType: "task", objectId: task.id, metadata: { rule: rule.name, action: action.action_type },
  });
}

/** Prebuilt rule templates surfaced in the UI. */
export const AUTOMATION_TEMPLATES = [
  {
    key: "overdue_reminder",
    name: "Overdue reminder",
    triggerType: "task_overdue" as const,
    description: "Notify the assignee when a task becomes overdue.",
    actions: [{ actionType: "notify" as const, params: { message: "This task is overdue" } }],
  },
  {
    key: "auto_assignment",
    name: "Auto-assign critical tasks",
    triggerType: "task_created" as const,
    description: "Assign newly created critical tasks to a default owner.",
    conditions: [{ field: "priority", op: "eq" as const, value: "critical" }],
    actions: [{ actionType: "assign" as const, params: {} }],
  },
  {
    key: "follow_up",
    name: "Follow-up on completion",
    triggerType: "task_status_changed" as const,
    description: "Create a follow-up task when work is completed.",
    actions: [{ actionType: "create_followup" as const, params: {} }],
  },
];
