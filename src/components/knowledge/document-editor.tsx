"use client";

import * as React from "react";
import { toast } from "sonner";
import { Save, History } from "lucide-react";
import { useDocument, useUpdateDocument } from "@/hooks/use-documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export function DocumentEditor({ documentId }: { documentId: string }) {
  const { data, isLoading } = useDocument(documentId);
  const update = useUpdateDocument(documentId);
  const [title, setTitle] = React.useState<string | null>(null);
  const [body, setBody] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data) { setTitle(data.document.title); setBody(data.body); }
  }, [data]);

  if (isLoading || !data || title === null || body === null) {
    return <p className="text-sm text-muted-foreground">Loading document…</p>;
  }
  const doc = data.document;

  async function save() {
    try {
      await update.mutateAsync({ title: title ?? undefined, body: body ?? undefined });
      toast.success("Saved as new version");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-semibold" />
        <div className="flex items-center gap-2">
          <select
            value={doc.type}
            onChange={(e) => update.mutate({ type: e.target.value as "doc" })}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="doc">Document</option><option value="sop">SOP</option><option value="policy">Policy</option>
          </select>
          <select
            value={doc.status}
            onChange={(e) => update.mutate({ status: e.target.value as "draft" })}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </select>
          <Button size="sm" onClick={save} disabled={update.isPending} className="ml-auto">
            <Save className="size-4" /> {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[420px] font-mono text-sm"
          placeholder="Write the document content here. Markdown supported."
        />
      </div>

      <Card className="h-fit">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><History className="size-4" /> Version history</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between text-sm">
              <Badge variant="secondary">v{v.version_no}</Badge>
              <span className="text-xs text-muted-foreground">{formatDate(v.created_at)}</span>
            </div>
          ))}
          {data.versions.length === 0 && <p className="text-xs text-muted-foreground">No versions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
