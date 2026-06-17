import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { createReportSchema } from "@/lib/validations/report";
import type { Json } from "@/types/database.types";

/** GET /api/reports?orgId=… — report definitions with their latest run. */
export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return error("orgId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: defs, error: qErr } = await supabase
    .from("report_definitions").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (qErr) return error(qErr.message, 500);

  const ids = (defs ?? []).map((d) => d.id);
  const { data: runs } = ids.length
    ? await supabase.from("report_runs").select("*").in("definition_id", ids).order("created_at", { ascending: false })
    : { data: [] };

  return json({
    reports: (defs ?? []).map((d) => ({
      ...d,
      lastRun: (runs ?? []).find((r) => r.definition_id === d.id) ?? null,
    })),
  });
}

/** POST /api/reports — create a report definition. */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const orgId = body?.orgId as string | undefined;
  if (!orgId) return error("orgId is required", 400);
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) return error("Invalid report", 422, parsed.error.flatten());

  const { data, error: iErr } = await supabase
    .from("report_definitions")
    .insert({
      org_id: orgId, name: parsed.data.name, type: parsed.data.type,
      workspace_id: parsed.data.workspaceId ?? null, scope: parsed.data.scope as Json,
      recipients: parsed.data.recipients as Json, created_by: user.id,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  return json({ report: data }, { status: 201 });
}
