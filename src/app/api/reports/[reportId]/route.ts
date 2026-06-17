import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";

type Ctx = { params: Promise<{ reportId: string }> };

/** GET /api/reports/:reportId — definition with its run history. */
export async function GET(_request: Request, { params }: Ctx) {
  const { reportId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: report } = await supabase.from("report_definitions").select("*").eq("id", reportId).maybeSingle();
  if (!report) return notFound("Report");

  const { data: runs } = await supabase
    .from("report_runs").select("*").eq("definition_id", reportId).order("created_at", { ascending: false });
  return json({ report, runs: runs ?? [] });
}

/** DELETE /api/reports/:reportId */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { reportId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { error: dErr } = await supabase.from("report_definitions").delete().eq("id", reportId);
  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
