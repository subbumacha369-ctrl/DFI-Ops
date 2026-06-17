import { anthropic, MODELS } from "@/lib/anthropic";

export type ExtractedTask = {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  assignee_hint?: string | null;
  due_hint?: string | null;
  confidence: number;
};

export type ExtractionResult = {
  model: string;
  summary: string;
  decisions: string[];
  tasks: ExtractedTask[];
};

const SYSTEM = `You convert raw operational input (meeting transcripts, voice notes,
documents, or natural-language requests) into structured, trackable work.
Return STRICT JSON only, no prose, matching:
{
  "summary": string,
  "decisions": string[],
  "tasks": [{ "title": string, "description": string, "priority": "low"|"medium"|"high"|"critical", "assignee_hint": string|null, "due_hint": string|null, "confidence": number }]
}
Confidence is 0..1. Keep titles imperative and concise. Extract only genuine action items.`;

/**
 * Run extraction over capture text. Uses Claude when ANTHROPIC_API_KEY is set;
 * otherwise falls back to a deterministic heuristic so the pipeline is usable
 * end-to-end in local development without credentials.
 */
export async function extractWork(input: {
  sourceType: string;
  title?: string | null;
  rawText: string;
}): Promise<ExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return heuristicExtract(input.rawText, input.title);
  }

  try {
    const msg = await anthropic.messages.create({
      model: MODELS.smart,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Source type: ${input.sourceType}\nTitle: ${input.title ?? "(none)"}\n\n${input.rawText}`,
        },
      ],
    });
    const text = msg.content
      .map((b) => ("text" in b ? b.text : ""))
      .join("")
      .trim();
    const json = text.startsWith("```")
      ? text.replace(/^```(json)?/i, "").replace(/```$/, "").trim()
      : text;
    const parsed = JSON.parse(json) as Omit<ExtractionResult, "model">;
    return {
      model: MODELS.smart,
      summary: parsed.summary ?? "",
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    // Network/parse failure → fall back so the pipeline still produces drafts.
    return heuristicExtract(input.rawText, input.title);
  }
}

/** No-LLM fallback: split into action-bearing lines and build draft tasks. */
function heuristicExtract(rawText: string, title?: string | null): ExtractionResult {
  const lines = rawText
    .split(/\n|(?<=[.!?])\s+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const actionVerbs =
    /\b(do|create|build|send|review|follow up|schedule|fix|update|prepare|call|email|draft|assign|complete|finish|deliver|plan|investigate|deploy|test|write|design)\b/i;
  const decisionMarkers = /\b(decided|agreed|approved|will go with|conclusion)\b/i;

  const decisions = lines.filter((l) => decisionMarkers.test(l)).slice(0, 5);
  const tasks: ExtractedTask[] = lines
    .filter((l) => actionVerbs.test(l) && l.length > 8)
    .slice(0, 12)
    .map((l) => {
      const priority: ExtractedTask["priority"] = /\b(urgent|asap|critical|immediately)\b/i.test(l)
        ? "critical"
        : /\b(important|high)\b/i.test(l)
          ? "high"
          : "medium";
      return {
        title: l.replace(/\s+/g, " ").slice(0, 140),
        description: undefined,
        priority,
        assignee_hint: (l.match(/@(\w+)/)?.[1] ?? null) as string | null,
        due_hint: null,
        confidence: 0.55,
      };
    });

  const summary =
    (title ? `${title}. ` : "") +
    `Auto-summary of ${lines.length} segment(s); ${tasks.length} action item(s) detected.`;

  return { model: "heuristic-fallback", summary, decisions, tasks };
}
