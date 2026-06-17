"use client";

import * as React from "react";
import Link from "next/link";
import { useDrilldown } from "@/hooks/use-metrics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MetricsFilters, DrillRow } from "@/services/metrics";

export type DrillRequest = { bucket: string; userId?: string };

export function DrillDownModal({
  orgId, orgSlug, request, filters, onClose,
}: {
  orgId: string;
  orgSlug: string;
  request: DrillRequest | null;
  filters: Partial<MetricsFilters>;
  onClose: () => void;
}) {
  const drill = useDrilldown(orgId);
  const [title, setTitle] = React.useState("");
  const [rows, setRows] = React.useState<DrillRow[]>([]);

  const run = drill.mutateAsync;
  React.useEffect(() => {
    if (!request) return;
    setTitle(""); setRows([]);
    run({ bucket: request.bucket, userId: request.userId, ...filters }).then((r) => {
      setTitle(r.title); setRows(r.rows);
    }).catch(() => setTitle("Could not load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title || "Loading…"}</DialogTitle></DialogHeader>
        <div className="space-y-1">
          {drill.isPending && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {!drill.isPending && rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing to show.</p>}
          {rows.map((r) => {
            const href = r.href ? `/${orgSlug}${r.href}` : null;
            const body = (
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.meta}</span>
              </div>
            );
            return href
              ? <Link key={r.id} href={href as never} onClick={onClose} className="block">{body}</Link>
              : <div key={r.id}>{body}</div>;
          })}
          {rows.length > 0 && (
            <p className="pt-2 text-center text-xs text-muted-foreground">{rows.length} item(s)</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
