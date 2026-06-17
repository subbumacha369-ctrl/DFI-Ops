import { getAuth, resolveWorkspaceOrg } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { createRuleSchema } from "@/lib/validations/automation";
import type { Json } from "@/types/database.types";

/** GET /api/automations?workspaceId=… — rules with their actions. */
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return error("workspaceId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: rules, error: qErr } = await supabase
    .from("automation_rules").select("*").eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (qErr) return error(qErr.message, 500);

  const ids = (rules ?? []).map((r) => r.id);
  const { data: actions } = ids.length
    ? await supabase.from("automation_actions").select("*").in("rule_id", ids).order("position")
    : { data: [] };

  return json({
    rules: (rules ?? []).map((r) => ({ ...r, actions: (actions ?? []).filter((a) => a.rule_id === r.id) })),
  });
}

/** POST /api/automations — create a rule and its ordered actions. */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) return error("Invalid rule", 422, parsed.error.flatten());

  const orgId = await resolveWorkspaceOrg(supabase, parsed.data.workspaceId);
  if (!orgId) return error("Workspace not found", 404);

  const { data: rule, error: iErr } = await supabase
    .from("automation_rules")
    .insert({
      org_id: orgId, workspace_id: parsed.data.workspaceId, name: parsed.data.name,
      trigger_type: parsed.data.triggerType, trigger: parsed.data.trigger as Json,
      conditions: parsed.data.conditions as Json, enabled: parsed.data.enabled, created_by: user.id,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  if (!rule) return error("Could not create rule", 403);

  if (parsed.data.actions.length) {
    await supabase.from("automation_actions").insert(
      parsed.data.actions.map((a, i) => ({
        org_id: orgId, rule_id: rule.id, position: i, action_type: a.actionType, params: a.params as Json,
      })),
    );
  }

  return json({ rule }, { status: 201 });
}
