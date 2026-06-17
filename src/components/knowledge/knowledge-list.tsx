"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Sparkles, FileText, BookText, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useDocuments, useCreateDocument, useDocSearch, type SearchResult } from "@/hooks/use-documents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  doc: FileText, sop: BookText, policy: ShieldCheck,
};

export function KnowledgeList() {
  const { orgSlug, workspaceId } = useWorkspace();
  const [type, setType] = React.useState<string>("all");
  const { data: docs, isLoading } = useDocuments(workspaceId, type === "all" ? undefined : type);
  const search = useDocSearch(workspaceId);
  const [query, setQuery] = React.useState("");
  const [aiAnswer, setAiAnswer] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<SearchResult[] | null>(null);

  async function runSearch(ai: boolean) {
    if (query.trim().length === 0) return;
    setAiAnswer(null);
    const res = await search.mutateAsync({ q: query, ai });
    setResults(res.results);
    if (ai) setAiAnswer(res.answer ?? "No answer.");
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch(false)}
                placeholder="Search documents and SOPs…"
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={() => runSearch(false)} disabled={search.isPending}>Search</Button>
            <Button onClick={() => runSearch(true)} disabled={search.isPending}>
              <Sparkles className="size-4" /> AI search
            </Button>
          </div>
          {aiAnswer && (
            <div className="rounded-md border bg-accent/40 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-primary"><Sparkles className="size-3.5" /> AI answer</div>
              <p className="whitespace-pre-wrap">{aiAnswer}</p>
            </div>
          )}
          {results && (
            <div className="space-y-1">
              {results.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
              {results.map((r) => (
                <Link key={r.id + r.snippet} href={`/${orgSlug}/w/${workspaceId}/knowledge/${r.id}` as never} className="block rounded border px-3 py-2 text-sm hover:bg-muted/50">
                  <span className="font-medium">{r.title}</span>
                  {r.snippet && <span className="ml-2 text-muted-foreground">…{r.snippet}…</span>}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Tabs value={type} onValueChange={setType}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="doc">Docs</TabsTrigger>
            <TabsTrigger value="sop">SOPs</TabsTrigger>
            <TabsTrigger value="policy">Policies</TabsTrigger>
          </TabsList>
        </Tabs>
        <CreateDocDialog />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading documents…</p>}
      {!isLoading && (docs ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <BookText className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(docs ?? []).map((d) => {
          const Icon = TYPE_ICON[d.type] ?? FileText;
          return (
            <Link key={d.id} href={`/${orgSlug}/w/${workspaceId}/knowledge/${d.id}` as never}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <Icon className="size-4 text-muted-foreground" />
                    <Badge variant={d.status === "published" ? "default" : "secondary"}>{d.status}</Badge>
                  </div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">Updated {formatDate(d.updated_at)}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CreateDocDialog() {
  const { workspaceId } = useWorkspace();
  const create = useCreateDocument(workspaceId);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<"doc" | "sop" | "policy">("doc");

  async function submit() {
    if (title.trim().length < 2) return toast.error("Enter a title");
    try {
      await create.mutateAsync({ title, type, body: "" });
      toast.success("Document created");
      setOpen(false); setTitle("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> New document</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create document</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div className="space-y-2">
            <Label>Type</Label>
            <select value={type} onChange={(e) => setType(e.target.value as "doc")} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
              <option value="doc">Document</option>
              <option value="sop">SOP</option>
              <option value="policy">Policy</option>
            </select>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
