"use client";

import * as React from "react";
import { CheckCheck, Bell } from "lucide-react";
import { useNotifications, useMarkAllRead, useMarkRead } from "@/hooks/use-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  task_assigned: "Assignment", task_updated: "Update", task_completed: "Completed",
  comment_added: "Comment", mention: "Mention", deadline_approaching: "Deadline",
  task_overdue: "Overdue", invitation: "Invitation", capture_processed: "AI capture",
  report_ready: "Report", automation: "Automation",
};

export function NotificationCenter() {
  const { data } = useNotifications();
  const markAll = useMarkAllRead();
  const markRead = useMarkRead();
  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          All notifications {unread > 0 && <Badge className="ml-2">{unread} new</Badge>}
        </CardTitle>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="divide-y p-0">
        {items.length === 0 && (
          <div className="py-12 text-center">
            <Bell className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications.</p>
          </div>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => markRead.mutate({ id: n.id })}
            className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 ${n.read_at ? "opacity-60" : ""}`}
          >
            {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
            <div className={`min-w-0 flex-1 ${n.read_at ? "pl-5" : ""}`}>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{n.title}</p>
                <Badge variant="secondary" className="shrink-0">{TYPE_LABEL[n.type] ?? n.type}</Badge>
              </div>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
