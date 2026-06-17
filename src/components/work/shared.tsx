"use client";

import * as React from "react";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { PersonLite, TaskPriority } from "@/types";

export const PRIORITY_META: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-priority-low/15 text-priority-low" },
  medium: { label: "Medium", className: "bg-priority-medium/15 text-priority-medium" },
  high: { label: "High", className: "bg-priority-high/15 text-priority-high" },
  critical: { label: "Critical", className: "bg-priority-critical/15 text-priority-critical" },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const meta = PRIORITY_META[priority];
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.className}`}>{meta.label}</span>;
}

export function StatusDot({ color }: { color: string }) {
  return <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export function PersonAvatar({ person, size = 24 }: { person: PersonLite | null; size?: number }) {
  if (!person) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-full border border-dashed text-[10px] text-muted-foreground"
        style={{ width: size, height: size }}
        title="Unassigned"
      >
        ?
      </span>
    );
  }
  return (
    <Avatar style={{ width: size, height: size }} className="shrink-0">
      <AvatarImage src={person.avatar_url ?? undefined} />
      <AvatarFallback className="text-[10px]">{initials(person.full_name, person.email)}</AvatarFallback>
    </Avatar>
  );
}

export function DueChip({ due, done }: { due: string | null; done?: boolean }) {
  if (!due) return null;
  const d = new Date(due);
  const overdue = !done && d.getTime() < Date.now();
  return (
    <Badge variant={overdue ? "destructive" : "outline"} className="font-normal">
      {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </Badge>
  );
}
