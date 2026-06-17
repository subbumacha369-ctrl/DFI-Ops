"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles, FileAudio, FileText, MessageSquare, Check, X, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useCaptures, useCapture, useCreateCapture, useConfirmDraft, useRejectDraft } from "@/hooks/use-ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/work/shared";
import { formatDate } from "@/lib/utils";
import type { CaptureSourceType } from "@/types";

const SOURCES: { value: CaptureSourceType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "meeting", label: "Meeting transcript", icon: FileText },
  { value: "voice", label: "Voice note", icon: FileAudio },
  { value: "document", label: "Document", icon: FileText },
  { value: "nl", label: "Natural-language request", icon: MessageSquare },
];

export function CapturePipeline() {
  const { workspaceId } = useWorkspace();
  const { data: captures } = useCaptures(workspaceId);
  const create = useCreateCapture(workspaceId);
  const [sourceType, setSourceType] = React.useState<CaptureSourceType>("meeting");
  const [title, setTitle] = React.useState("");
  const [rawText, setRawText] = React.useState("");
  const [activeCapture, setActiveCapture] = React.useState<string | null>(null);

  async function submit() {
    if (rawText.trim().length < 1) return toast.error("Paste some content to process");
    try {
      const res = await create.mutateAsync({ sourceType, title: title || undefined, rawText });
      toast.success(`Extracted ${res.draftCount} draft task(s)`);
      setActiveCapture(res.captureId);
      setRawText(""); setTitle("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Capture failed"); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* Step 1: Capture */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" /> Capture
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Paste a transcript, note, or request. We extract a summary, decisions, and draft tasks for you to confirm.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSourceType(s.value)}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${sourceType === s.value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <s.icon className="size-4" /> {s.label}
                </button>
              ))}
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={sourceType === "voice" ? "Paste the voice-note transcription here…" : "Paste content here…"}
              className="min-h-[180px]"
            />
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? "Processing…" : <>Extract work <ArrowRight className="size-4" /></>}
            </Button>
          </CardContent>
        </Card>

        {/* Steps 2-4: Review extraction + confirm drafts */}
        {activeCapture && <CaptureReview captureId={activeCapture} />}
      </div>

      {/* Recent captures */}
      <Card className="h-fit">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Recent captures</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {(captures ?? []).length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
          {(captures ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCapture(c.id)}
              className={`block w-full rounded border px-2 py-1.5 text-left text-sm hover:bg-muted/50 ${activeCapture === c.id ? "border-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{c.title ?? c.source_type}</span>
                <Badge variant="secondary">{c.status}</Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">{formatDate(c.created_at)}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CaptureReview({ captureId }: { captureId: string }) {
  const { data, isLoading } = useCapture(captureId);
  const confirm = useConfirmDraft(captureId);
  const reject = useRejectDraft(captureId);

  if (isLoading || !data) return <Card><CardContent className="py-6 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  const decisions = (data.extraction?.output as { decisions?: string[] } | null)?.decisions
    ?? [];
  const pending = data.drafts.filter((d) => d.status === "pending");

  return (
    <>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Summary & decisions</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{data.extraction?.summary ?? "No summary."}</p>
          {decisions.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decisions</p>
              <ul className="list-inside list-disc space-y-0.5">{decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Confirm draft tasks</CardTitle>
          <p className="text-sm text-muted-foreground">Review AI suggestions and promote them to tracked tasks.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.drafts.length === 0 && <p className="text-sm text-muted-foreground">No drafts produced.</p>}
          {data.drafts.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`truncate text-sm font-medium ${d.status !== "pending" ? "line-through opacity-60" : ""}`}>{d.title}</span>
                  <PriorityBadge priority={d.priority} />
                  <span className="text-[11px] text-muted-foreground">{Math.round(d.confidence * 100)}%</span>
                </div>
                {d.description && <p className="truncate text-xs text-muted-foreground">{d.description}</p>}
              </div>
              {d.status === "pending" ? (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => reject.mutate(d.id)}><X className="size-4" /></Button>
                  <Button size="sm" onClick={async () => { await confirm.mutateAsync({ draftId: d.id }); toast.success("Task created"); }}>
                    <Check className="size-4" /> Confirm
                  </Button>
                </div>
              ) : (
                <Badge variant={d.status === "accepted" ? "default" : "secondary"} className="shrink-0">{d.status}</Badge>
              )}
            </div>
          ))}
          {pending.length > 1 && (
            <Button
              variant="outline" size="sm"
              onClick={async () => { for (const d of pending) await confirm.mutateAsync({ draftId: d.id }); toast.success("All confirmed"); }}
            >
              <Check className="size-4" /> Confirm all ({pending.length})
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}
