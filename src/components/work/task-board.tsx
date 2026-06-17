"use client";

import * as React from "react";
import { List, KanbanSquare, Calendar as CalIcon } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useTasks, useTaskStatuses, useUpdateTask } from "@/hooks/use-tasks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { PriorityBadge, PersonAvatar, StatusDot, DueChip } from "./shared";
import { TaskCreateDialog } from "./task-create-dialog";
import { TaskDetailDialog } from "./task-detail";
import type { TaskWithRelations } from "@/types";

export function TaskBoard({ projectId }: { projectId?: string }) {
  const { workspaceId } = useWorkspace();
  const { data: tasks, isLoading } = useTasks(workspaceId, { topLevel: true, projectId });
  const { data: statuses } = useTaskStatuses(workspaceId);
  const [selected, setSelected] = React.useState<string | null>(null);

  // Open task from ?task= deep link.
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("task");
    if (id) setSelected(id);
  }, []);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="list">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list"><List className="mr-1 size-4" /> List</TabsTrigger>
            <TabsTrigger value="kanban"><KanbanSquare className="mr-1 size-4" /> Kanban</TabsTrigger>
            <TabsTrigger value="calendar"><CalIcon className="mr-1 size-4" /> Calendar</TabsTrigger>
          </TabsList>
          <TaskCreateDialog defaultProjectId={projectId} />
        </div>

        <TabsContent value="list">
          <ListView tasks={tasks ?? []} loading={isLoading} onOpen={setSelected} />
        </TabsContent>
        <TabsContent value="kanban">
          <KanbanView tasks={tasks ?? []} statuses={statuses ?? []} onOpen={setSelected} />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView tasks={tasks ?? []} onOpen={setSelected} />
        </TabsContent>
      </Tabs>

      <TaskDetailDialog taskId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ListView({ tasks, loading, onOpen }: { tasks: TaskWithRelations[]; loading: boolean; onOpen: (id: string) => void }) {
  if (loading) return <p className="py-8 text-sm text-muted-foreground">Loading tasks…</p>;
  if (tasks.length === 0) return <Empty />;
  return (
    <Card className="divide-y">
      {tasks.map((t) => (
        <button key={t.id} onClick={() => onOpen(t.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50">
          <StatusDot color={t.status?.color ?? "#94a3b8"} />
          <span className={`flex-1 truncate text-sm ${t.completed_at ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
          <PriorityBadge priority={t.priority} />
          {t.project && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{t.project.name}</span>}
          <DueChip due={t.due_date} done={!!t.completed_at} />
          <PersonAvatar person={t.assignee} />
        </button>
      ))}
    </Card>
  );
}

function KanbanView({
  tasks, statuses, onOpen,
}: {
  tasks: TaskWithRelations[];
  statuses: { id: string; name: string; color: string }[];
  onOpen: (id: string) => void;
}) {
  const { workspaceId } = useWorkspace();
  const update = useUpdateTask(workspaceId);
  const [dragId, setDragId] = React.useState<string | null>(null);

  function drop(statusId: string) {
    if (dragId) {
      update.mutate({ taskId: dragId, statusId });
      setDragId(null);
    }
  }

  if (statuses.length === 0) return <Empty />;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {statuses.map((s) => {
        const col = tasks.filter((t) => t.status_id === s.id);
        return (
          <div
            key={s.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(s.id)}
            className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
          >
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <StatusDot color={s.color} />
              <span className="text-sm font-medium">{s.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="flex-1 space-y-2 p-2">
              {col.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onClick={() => onOpen(t.id)}
                  className="cursor-pointer rounded-md border bg-card p-2.5 text-sm shadow-sm hover:border-primary/40"
                >
                  <p className="mb-1.5 line-clamp-2">{t.title}</p>
                  <div className="flex items-center justify-between">
                    <PriorityBadge priority={t.priority} />
                    <div className="flex items-center gap-1.5">
                      <DueChip due={t.due_date} done={!!t.completed_at} />
                      <PersonAvatar person={t.assignee} size={20} />
                    </div>
                  </div>
                </div>
              ))}
              {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Drop here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ tasks, onOpen }: { tasks: TaskWithRelations[]; onOpen: (id: string) => void }) {
  const [month, setMonth] = React.useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const byDay = new Map<number, TaskWithRelations[]>();
  for (const t of tasks) {
    if (!t.due_date) continue;
    const d = new Date(t.due_date);
    if (d.getFullYear() === year && d.getMonth() === m) {
      const day = d.getDate();
      byDay.set(day, [...(byDay.get(day) ?? []), t]);
    }
  }

  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{month.toLocaleString(undefined, { month: "long", year: "numeric" })}</h3>
        <div className="flex gap-1">
          <button onClick={() => setMonth(new Date(year, m - 1, 1))} className="rounded border px-2 py-1 text-xs hover:bg-muted">Prev</button>
          <button onClick={() => setMonth(new Date(year, m + 1, 1))} className="rounded border px-2 py-1 text-xs hover:bg-muted">Next</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className="min-h-20 rounded border p-1 text-left align-top">
            {day && (
              <>
                <div className="mb-1 text-[11px] text-muted-foreground">{day}</div>
                <div className="space-y-0.5">
                  {(byDay.get(day) ?? []).slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onOpen(t.id)}
                      className="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted"
                      style={{ borderLeft: `2px solid ${t.status?.color ?? "#94a3b8"}` }}
                    >
                      {t.title}
                    </button>
                  ))}
                  {(byDay.get(day)?.length ?? 0) > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{(byDay.get(day)!.length - 3)} more</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Empty() {
  return (
    <div className="rounded-lg border border-dashed py-12 text-center">
      <p className="text-sm text-muted-foreground">No tasks yet. Create your first task to get started.</p>
    </div>
  );
}
