import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { evaluateRule } from "@/services/automation";

type Ctx = { params: Promise<{ ruleId: string }> };

/** POST /api/automations/:ruleId/run — evaluate the rule now and run its actions. */
export async function POST(_request: Request, { params }: Ctx) {
  const { ruleId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: rule } = await supabase.from("automation_rules").select("*").eq("id", ruleId).maybeSingle();
  if (!rule) return notFound("Rule");

  const { data: actions } = await supabase
    .from("automation_actions").select("*").eq("rule_id", ruleId).order("position");

  const result = await evaluateRule(supabase, rule, actions ?? [], user.id);
  if (result.result === "error") return error(result.error ?? "Run failed", 500);
  return json(result);
}
