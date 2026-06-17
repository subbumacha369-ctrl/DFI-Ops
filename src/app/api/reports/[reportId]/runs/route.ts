import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { computeOrgMetrics } from "@/services/metrics";
import { anthropic, MODELS } from "@/lib/anthropic";
import type { Json } from "@/types/database.types";

type Ctx = { params: Promise<{ reportId: string }> };

/**
 * POST /api/reports/:reportId/runs — generate a report run.
 * Computes grounded metrics (the source of truth), then optionally adds an AI
 * narrative summary. Periods default to the report type's natural window.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { reportId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: def } = await supabase.from("report_definitions").select("*").eq("id", reportId).maybeSingle();
  if (!def) return notFound("Report");

  const days = def.type === "monthly" ? 30 : 7;
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - days * 86_400_000);

  const scope = (def.scope ?? {}) as { workspaceId?: string };
  const metrics = await computeOrgMetrics(supabase, def.org_id, {
    workspaceId: def.workspace_id ?? scope.workspaceId,
    days,
  });

  // AI narrative (best-effort; grounded strictly in the computed metrics).
  let aiSummary = buildTextSummary(def.name, metrics, days);
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const msg = await anthropic.messages.create({
        model: MODELS.fast,
        max_tokens: 600,
        system: "Write a concise operations status summary using ONLY the provided JSON metrics. Do not invent numbers.",
        messages: [{ role: "user", content: `Report: ${def.name}\nWindow: last ${days} days\nMetrics: ${JSON.stringify(metrics)}` }],
      });
      aiSummary = msg.content.map((b) => ("text" in b ? b.text : "")).join("").trim() || aiSummary;
    } catch {
      // keep deterministic summary
    }
  }

  const { data: run, error: iErr } = await supabase
    .from("report_runs")
    .insert({
      org_id: def.org_id, definition_id: reportId,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      status: "completed", metrics: metrics as unknown as Json, ai_summary: aiSummary,
      generated_at: new Date().toISOString(),
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  return json({ run }, { status: 201 });
}

function buildTextSummary(name: string, m: Awaited<ReturnType<typeof computeOrgMetrics>>, days: number): string {
  return [
    `${name} — last ${days} days.`,
    `${m.totalTasks} tasks total, ${m.completedTasks} completed (${m.completionRate}% completion rate).`,
    `${m.pendingTasks} pending, ${m.overdueTasks} overdue across ${m.activeProjects} active project(s).`,
    m.workload.length ? `Top load: ${m.workload.slice(0, 3).map((w) => `${w.name} (${w.open})`).join(", ")}.` : "",
  ].filter(Boolean).join(" ");
}
