import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { updateRuleSchema } from "@/lib/validations/automation";
import type { Database, Json } from "@/types/database.types";

type Ctx = { params: Promise<{ ruleId: string }> };
type RuleUpdate = Database["public"]["Tables"]["automation_rules"]["Update"];

/** GET /api/automations/:ruleId — rule with actions and recent run logs. */
export async function GET(_request: Request, { params }: Ctx) {
  const { ruleId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: rule } = await supabase.from("automation_rules").select("*").eq("id", ruleId).maybeSingle();
  if (!rule) return error("Rule not found", 404);

  const [{ data: actions }, { data: logs }] = await Promise.all([
    supabase.from("automation_actions").select("*").eq("rule_id", ruleId).order("position"),
    supabase.from("automation_run_logs").select("*").eq("rule_id", ruleId).order("fired_at", { ascending: false }).limit(20),
  ]);
  return json({ rule, actions: actions ?? [], logs: logs ?? [] });
}

/** PATCH /api/automations/:ruleId */
export async function PATCH(request: Request, { params }: Ctx) {
  const { ruleId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update", 422);

  const patch: RuleUpdate = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.triggerType !== undefined) patch.trigger_type = parsed.data.triggerType;
  if (parsed.data.trigger !== undefined) patch.trigger = parsed.data.trigger as Json;
  if (parsed.data.conditions !== undefined) patch.conditions = parsed.data.conditions as Json;
  if (parsed.data.enabled !== undefined) patch.enabled = parsed.data.enabled;

  const { data, error: uErr } = await supabase
    .from("automation_rules").update(patch).eq("id", ruleId).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  if (!data) return error("Update not permitted", 403);
  return json({ rule: data });
}

/** DELETE /api/automations/:ruleId */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { ruleId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { error: dErr } = await supabase.from("automation_rules").delete().eq("id", ruleId);
  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
