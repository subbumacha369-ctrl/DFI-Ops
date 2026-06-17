import { getAuth, resolveWorkspaceOrg } from "@/lib/auth-route";
import { json, error, unauthorized, tooMany } from "@/lib/api";
import { checkLimit, writeRatelimit } from "@/lib/redis";
import { createCaptureSchema } from "@/lib/validations/capture";
import { extractWork } from "@/services/ai/extract";
import { logActivity } from "@/services/activity";
import type { Json } from "@/types/database.types";

/** GET /api/captures?workspaceId=… — recent captures. */
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return error("workspaceId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("captures").select("*").eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false }).limit(50);
  if (qErr) return error(qErr.message, 500);
  return json({ captures: data ?? [] });
}

/**
 * POST /api/captures — the Capture → Extract → Confirm pipeline (steps 1–2).
 * Creates the capture, runs AI extraction (or heuristic fallback), and persists
 * the summary, decisions, and candidate work drafts for confirmation.
 */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { success } = await checkLimit(writeRatelimit, `capture:${user.id}`);
  if (!success) return tooMany();

  const body = await request.json().catch(() => null);
  const parsed = createCaptureSchema.safeParse(body);
  if (!parsed.success) return error("Invalid capture", 422, parsed.error.flatten());

  const orgId = await resolveWorkspaceOrg(supabase, parsed.data.workspaceId);
  if (!orgId) return error("Workspace not found", 404);

  // 1. Capture.
  const { data: capture, error: cErr } = await supabase
    .from("captures")
    .insert({
      org_id: orgId, workspace_id: parsed.data.workspaceId, source_type: parsed.data.sourceType,
      title: parsed.data.title ?? null, raw_text: parsed.data.rawText, status: "extracting", created_by: user.id,
    })
    .select("*").maybeSingle();
  if (cErr) return error(cErr.message, 403);
  if (!capture) return error("Could not create capture", 403);

  // 2. Extract.
  const extraction = await extractWork({
    sourceType: parsed.data.sourceType,
    title: parsed.data.title,
    rawText: parsed.data.rawText,
  });

  const { data: extractionRow, error: eErr } = await supabase
    .from("extractions")
    .insert({
      org_id: orgId, capture_id: capture.id, model: extraction.model,
      summary: extraction.summary, output: extraction as unknown as Json,
    })
    .select("id").maybeSingle();

  if (eErr || !extractionRow) {
    await supabase.from("captures").update({ status: "failed", error: eErr?.message ?? "extraction failed" }).eq("id", capture.id);
    return error(eErr?.message ?? "Extraction failed", 500);
  }

  // Meeting metadata for meeting captures.
  if (parsed.data.sourceType === "meeting") {
    await supabase.from("meetings").insert({
      org_id: orgId, capture_id: capture.id, title: parsed.data.title ?? "Meeting",
      summary: extraction.summary, decisions: extraction.decisions as unknown as Json,
    });
  }

  // Candidate work drafts (pending confirmation).
  if (extraction.tasks.length) {
    await supabase.from("work_drafts").insert(
      extraction.tasks.map((t) => ({
        org_id: orgId, workspace_id: parsed.data.workspaceId, extraction_id: extractionRow.id,
        title: t.title, description: t.description ?? null, priority: t.priority, confidence: t.confidence,
      })),
    );
  }

  await supabase.from("captures").update({ status: "reviewed" }).eq("id", capture.id);
  await logActivity(supabase, {
    orgId, workspaceId: parsed.data.workspaceId, actorId: user.id,
    verb: "captured", objectType: "capture", objectId: capture.id,
    metadata: { source: parsed.data.sourceType, tasks: extraction.tasks.length },
  });

  return json(
    { captureId: capture.id, extractionId: extractionRow.id, summary: extraction.summary, decisions: extraction.decisions, draftCount: extraction.tasks.length },
    { status: 201 },
  );
}
