"use client";

import * as React from "react";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, FolderKanban, AlertOctagon, Filter } from "lucide-react";
import { useMetrics } from "@/hooks/use-metrics";
import { useAccess } from "@/hooks/use-access";
import { useDepartments, useTeams, useMembers } from "@/hooks/use-members";
import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart, BarRows, CompletionDonut, Heatmap } from "@/components/charts/charts";
import { DrillDownModal, type DrillRequest } from "./drilldown-modal";
import type { MetricsFilters } from "@/services/metrics";

export function DashboardCharts({
  orgId, orgSlug, workspaces = [],
}: {
  orgId: string; orgSlug: string; workspaces?: { id: string; name: string }[];
}) {
  const [filters, setFilters] = React.useState<Partial<MetricsFilters>>({ days: 14 });
  const [drill, setDrill] = React.useState<DrillRequest | null>(null);

  const access = useAccess(orgId);
  const { data: m, isLoading } = useMetrics(orgId, filters);
  const { data: depts } = useDepartments(orgId);
  const { data: teams } = useTeams(orgId);
  const { data: members } = useMembers(orgId);
  const { data: projects } = useProjects(workspaces[0]?.id);

  const show = (key: string) => access.isVisible(key);
  const set = (patch: Partial<MetricsFilters>) => setFilters((f) => ({ ...f, ...patch }));

  if (access.appRole && !access.can("dashboard", "view")) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to the dashboard.</p>;
  }
  if (isLoading || !m) return <p className="text-sm text-muted-foreground">Loading metrics…</p>;

  const cards = [
    { key: "total", label: "Total tasks", value: m.totalTasks, icon: ListTodo, bucket: "task_all" },
    { key: "completed", label: "Completed", value: m.completedTasks, icon: CheckCircle2, bucket: "task_completed" },
    { key: "pending", label: "Pending", value: m.pendingTasks, icon: Clock, bucket: "task_pending" },
    { key: "overdue", label: "Overdue", value: m.overdueTasks, icon: AlertTriangle, bucket: "task_overdue", alert: m.overdueTasks > 0 },
    { key: "active", label: "Active projects", value: m.activeProjects, icon: FolderKanban, bucket: "project_active" },
    { key: "delayed", label: "Delayed projects", value: m.delayedProjects, icon: AlertOctagon, bucket: "project_delayed", alert: m.delayedProjects > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Filter className="size-3.5" /> Filters</span>
          <select value={filters.days ?? 14} onChange={(e) => set({ days: Number(e.target.value) })} className="rounded-md border bg-background px-2 py-1.5 text-sm">
            <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
          <select value={filters.departmentId ?? ""} onChange={(e) => set({ departmentId: e.target.value || undefined })} className="rounded-md border bg-background px-2 py-1.5 text-sm">
            <option value="">All departments</option>{(depts ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filters.teamId ?? ""} onChange={(e) => set({ teamId: e.target.value || undefined })} className="rounded-md border bg-background px-2 py-1.5 text-sm">
            <option value="">All teams</option>{(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filters.projectId ?? ""} onChange={(e) => set({ projectId: e.target.value || undefined })} className="rounded-md border bg-background px-2 py-1.5 text-sm">
            <option value="">All projects</option>{(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filters.assignedTo ?? ""} onChange={(e) => set({ assignedTo: e.target.value || undefined })} className="rounded-md border bg-background px-2 py-1.5 text-sm">
            <option value="">All employees</option>{(members ?? []).map((mem) => <option key={mem.user_id} value={mem.user_id}>{mem.profile?.full_name ?? mem.profile?.email}</option>)}
          </select>
          {(filters.departmentId || filters.teamId || filters.projectId || filters.assignedTo) && (
            <button onClick={() => setFilters({ days: filters.days })} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </CardContent>
      </Card>

      {/* KPI cards — every card drills down */}
      {show("widget.kpis") && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((s) => (
            <button key={s.key} onClick={() => setDrill({ bucket: s.bucket })} className="text-left">
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                  <s.icon className={`size-4 ${s.alert ? "text-destructive" : "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent><div className={`text-2xl font-semibold ${s.alert ? "text-destructive" : ""}`}>{s.value}</div></CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {show("widget.trend") && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Task trend ({filters.days ?? 14} days)</CardTitle>
              <button onClick={() => setDrill({ bucket: "task_all" })} className="text-xs text-primary hover:underline">View tasks →</button>
            </CardHeader>
            <CardContent>
              <button onClick={() => setDrill({ bucket: "task_all" })} className="block w-full"><TrendChart data={m.trend} /></button>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-muted-foreground" /> Created</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-primary" /> Completed</span>
              </div>
            </CardContent>
          </Card>
        )}
        {show("widget.completion") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Completion</CardTitle>
              <button onClick={() => setDrill({ bucket: "project_all" })} className="text-xs text-primary hover:underline">Analytics →</button>
            </CardHeader>
            <CardContent className="grid place-items-center">
              <button onClick={() => setDrill({ bucket: "project_all" })}><CompletionDonut rate={m.completionRate} /></button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {show("widget.workload") && (
          <Card>
            <CardHeader><CardTitle className="text-base">Workload by assignee</CardTitle></CardHeader>
            <CardContent>
              <BarRows
                data={m.workload.map((w) => ({ label: w.name, value: w.open, id: w.userId }))}
                onRowClick={(it) => it.id && setDrill({ bucket: "employee", userId: it.id })}
              />
            </CardContent>
          </Card>
        )}
        {show("widget.priority") && (
          <Card>
            <CardHeader><CardTitle className="text-base">Priority breakdown</CardTitle></CardHeader>
            <CardContent>
              <BarRows
                data={Object.entries(m.byPriority).map(([k, v]) => ({ label: k, value: v }))}
                color="hsl(var(--priority-high))"
                onRowClick={() => setDrill({ bucket: "task_all" })}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {show("widget.heatmap") && (
        <Card>
          <CardHeader><CardTitle className="text-base">Team load heatmap</CardTitle></CardHeader>
          <CardContent>
            <Heatmap
              cells={m.workload.map((w) => ({ label: w.name, value: w.open, id: w.userId }))}
              onCellClick={(it) => it.id && setDrill({ bucket: "employee", userId: it.id })}
            />
          </CardContent>
        </Card>
      )}

      <DrillDownModal orgId={orgId} orgSlug={orgSlug} request={drill} filters={filters} onClose={() => setDrill(null)} />
    </div>
  );
}
