"use client";

import * as React from "react";
import {
  Plus, Pencil, CheckCircle2, MessageSquare, Trash2, Sparkles, Zap, Activity as ActivityIcon,
} from "lucide-react";
import { useActivity } from "@/hooks/use-activity";
import { Card, CardContent } from "@/components/ui/card";
import { PersonAvatar } from "@/components/work/shared";
import { formatDate } from "@/lib/utils";

const VERB_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Plus, updated: Pencil, status_changed: ActivityIcon, completed: CheckCircle2,
  commented: MessageSquare, deleted: Trash2, captured: Sparkles, confirmed: CheckCircle2,
  automation_ran: Zap,
};

const VERB_TEXT: Record<string, string> = {
  created: "created", updated: "updated", status_changed: "changed status of",
  completed: "completed", commented: "commented on", deleted: "deleted",
  captured: "captured", confirmed: "confirmed a task from", automation_ran: "ran automation on",
};

export function ActivityFeed({ orgId, workspaceId }: { orgId: string; workspaceId?: string }) {
  const { data: events, isLoading } = useActivity(orgId, workspaceId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading activity…</p>;
  if ((events ?? []).length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <ActivityIcon className="mx-auto mb-2 size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ol className="divide-y">
          {(events ?? []).map((e) => {
            const Icon = VERB_ICON[e.verb] ?? ActivityIcon;
            const meta = (e.metadata ?? {}) as { title?: string; name?: string };
            const label = meta.title ?? meta.name ?? e.object_type;
            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-muted">
                  <Icon className="size-3.5 text-muted-foreground" />
                </span>
                <PersonAvatar person={e.actor} size={24} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{e.actor?.full_name ?? e.actor?.email ?? "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{VERB_TEXT[e.verb] ?? e.verb}</span>{" "}
                    <span className="font-medium">{label}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
