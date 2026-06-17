"use client";

import * as React from "react";
import { useAudit } from "@/hooks/use-admin";
import { PersonAvatar } from "@/components/work/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  "permission.changed": "Permission change",
  "visibility.changed": "Visibility change",
  "role.changed": "Role change",
  "updated": "Update",
};

function summarize(v: unknown): string {
  if (v == null) return "—";
  if (typeof v !== "object") return String(v);
  return Object.entries(v as Record<string, unknown>).map(([k, val]) => `${k}: ${String(val)}`).join(", ");
}

export function AuditLog({ orgId }: { orgId: string }) {
  const { data: events, isLoading } = useAudit(orgId);
  const [filter, setFilter] = React.useState("all");

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading audit trail…</p>;
  const rows = (events ?? []).filter((e) => filter === "all" || e.action.startsWith(filter));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Tamper-evident, append-only record of permission, role, visibility, and access changes.</p>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
          <option value="all">All actions</option>
          <option value="permission">Permission</option>
          <option value="visibility">Visibility</option>
          <option value="role">Role</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No audit events.</div>}
          {rows.map((e) => (
            <div key={e.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
              <PersonAvatar person={e.actor} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{e.actor?.full_name ?? e.actor?.email ?? "System"}</span>
                  <Badge variant="secondary">{ACTION_LABEL[e.action] ?? e.action}</Badge>
                  <span className="text-xs text-muted-foreground">{e.entity_type}</span>
                </div>
                <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <div><span className="font-medium">Old:</span> {summarize(e.before)}</div>
                  <div><span className="font-medium">New:</span> {summarize(e.after)}</div>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(e.created_at)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
