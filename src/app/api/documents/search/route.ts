import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { anthropic, MODELS } from "@/lib/anthropic";

/**
 * GET /api/documents/search?workspaceId=…&q=…&ai=1
 * Keyword mode: trigram/ILIKE over titles and bodies.
 * AI mode: retrieves candidate documents and asks Claude to answer with citations
 *          (falls back to keyword results when no ANTHROPIC_API_KEY is set).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const q = url.searchParams.get("q")?.trim();
  const ai = url.searchParams.get("ai") === "1";
  if (!workspaceId || !q) return error("workspaceId and q are required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  // Candidate documents by title.
  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, type, current_version_id, status")
    .eq("workspace_id", workspaceId)
    .ilike("title", `%${q}%`)
    .limit(20);

  // Also search bodies via the current versions of all docs in the workspace.
  const { data: allDocs } = await supabase
    .from("documents").select("id, title, type, current_version_id, status").eq("workspace_id", workspaceId);
  const versionIds = (allDocs ?? []).map((d) => d.current_version_id).filter(Boolean) as string[];
  const { data: versions } = versionIds.length
    ? await supabase.from("doc_versions").select("id, document_id, body").in("id", versionIds)
    : { data: [] };

  const bodyMatches = (versions ?? [])
    .filter((v) => v.body.toLowerCase().includes(q.toLowerCase()))
    .map((v) => {
      const doc = (allDocs ?? []).find((d) => d.id === v.document_id);
      const idx = v.body.toLowerCase().indexOf(q.toLowerCase());
      const snippet = v.body.slice(Math.max(0, idx - 80), idx + 120).replace(/\s+/g, " ");
      return { id: v.document_id, title: doc?.title ?? "Untitled", type: doc?.type ?? "doc", snippet };
    });

  const titleResults = (docs ?? []).map((d) => ({ id: d.id, title: d.title, type: d.type, snippet: "" }));
  const seen = new Set<string>();
  const results = [...titleResults, ...bodyMatches].filter((r) => {
    const key = r.id + r.snippet;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!ai) return json({ mode: "keyword", results });

  // AI mode: build context from matching bodies and ask Claude.
  const context = (versions ?? [])
    .map((v) => {
      const doc = (allDocs ?? []).find((d) => d.id === v.document_id);
      return `# ${doc?.title ?? "Untitled"} (id: ${v.document_id})\n${v.body.slice(0, 2000)}`;
    })
    .join("\n\n---\n\n")
    .slice(0, 12_000);

  if (!process.env.ANTHROPIC_API_KEY || !context) {
    return json({
      mode: "ai-fallback",
      answer:
        results.length > 0
          ? `Found ${results.length} matching document(s). Configure ANTHROPIC_API_KEY for synthesized answers.`
          : "No matching documents found.",
      results,
    });
  }

  try {
    const msg = await anthropic.messages.create({
      model: MODELS.fast,
      max_tokens: 1024,
      system:
        "Answer the user's question using ONLY the provided knowledge-base documents. Cite document titles inline. If the answer isn't present, say so.",
      messages: [{ role: "user", content: `Question: ${q}\n\nDocuments:\n${context}` }],
    });
    const answer = msg.content.map((b) => ("text" in b ? b.text : "")).join("").trim();
    return json({ mode: "ai", answer, results });
  } catch {
    return json({ mode: "ai-error", answer: "AI search is temporarily unavailable.", results });
  }
}
