import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";

type Ctx = { params: Promise<{ captureId: string }> };

/** GET /api/captures/:captureId — capture with its extraction summary + drafts. */
export async function GET(_request: Request, { params }: Ctx) {
  const { captureId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: capture, error: qErr } = await supabase
    .from("captures").select("*").eq("id", captureId).maybeSingle();
  if (qErr) return error(qErr.message, 500);
  if (!capture) return notFound("Capture");

  const { data: extraction } = await supabase
    .from("extractions").select("*").eq("capture_id", captureId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: drafts } = extraction
    ? await supabase.from("work_drafts").select("*").eq("extraction_id", extraction.id).order("confidence", { ascending: false })
    : { data: [] };

  return json({ capture, extraction: extraction ?? null, drafts: drafts ?? [] });
}
