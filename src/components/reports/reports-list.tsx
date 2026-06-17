"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, FileBarChart, RefreshCw, Trash2 } from "lucide-react";
import { useReports, useCreateReport, useGenerateReport, useDeleteReport } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { OrgMetrics } from "@/services/metrics";

export function ReportsList({ orgId }: { orgId: string }) {
  const { data: reports, isLoading } = useReports(orgId);
  const generate = useGenerateReport(orgId);
  const del = useDeleteReport(orgId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Weekly, monthly, project and team reports — grounded metrics with an AI narrative.
        </p>
        <CreateReportDialog orgId={orgId} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading reports…</p>}
      {!isLoading && (reports ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <FileBarChart className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No reports defined yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {(reports ?? []).map((r) => {
          const metrics = r.lastRun?.metrics as unknown as OrgMetrics | undefined;
          return (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {r.name} <Badge variant="secondary" className="capitalize">{r.type}</Badge>
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="sm" variant="outline"
                    onClick={async () => { await generate.mutateAsync(r.id); toast.success("Report generated"); }}
                    disabled={generate.isPending}
                  >
                    <RefreshCw className="size-4" /> Generate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!r.lastRun && <p className="text-sm text-muted-foreground">No runs yet — generate one.</p>}
                {r.lastRun && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Last run {formatDate(r.lastRun.generated_at ?? r.lastRun.created_at)} · {r.lastRun.period_start} → {r.lastRun.period_end}
                    </p>
                    {metrics && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Stat label="Total" value={metrics.totalTasks} />
                        <Stat label="Completed" value={metrics.completedTasks} />
                        <Stat label="Overdue" value={metrics.overdueTasks} />
                        <Stat label="Completion" value={`${metrics.completionRate}%`} />
                      </div>
                    )}
                    {r.lastRun.ai_summary && (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm">{r.lastRun.ai_summary}</div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CreateReportDialog({ orgId }: { orgId: string }) {
  const create = useCreateReport(orgId);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"weekly" | "monthly" | "custom">("weekly");

  // Lazy import of dialog to keep this file cohesive.
  return (
    <DialogWrap
      open={open} setOpen={setOpen}
      onSubmit={async () => {
        if (name.trim().length < 2) return toast.error("Enter a name");
        try {
          await create.mutateAsync({ name, type, scope: { kind: "org" }, recipients: [] });
          toast.success("Report created"); setOpen(false); setName("");
        } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
      }}
      pending={create.isPending}
    >
      <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
      <div className="space-y-2">
        <Label>Type</Label>
        <select value={type} onChange={(e) => setType(e.target.value as "weekly")} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
          <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom</option>
        </select>
      </div>
    </DialogWrap>
  );
}

// Small inline dialog wrapper to avoid repetition.
function DialogWrap({
  open, setOpen, onSubmit, pending, children,
}: {
  open: boolean; setOpen: (v: boolean) => void; onSubmit: () => void; pending: boolean; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> New report</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create report</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        <DialogFooter><Button onClick={onSubmit} disabled={pending}>{pending ? "Creating…" : "Create"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
