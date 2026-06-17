"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Check, Circle, UserPlus, Trash2 } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import {
  useProject, useUpdateProject, useCreateMilestone, useUpdateMilestone,
  useAddProjectMember, useRemoveProjectMember,
} from "@/hooks/use-projects";
import { useOrgMembers } from "@/hooks/use-org-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PersonAvatar } from "./shared";
import { TaskBoard } from "./task-board";
import { formatDate } from "@/lib/utils";

const STATUSES = ["active", "on_hold", "completed", "archived"];

export function ProjectDetail({ projectId }: { projectId: string }) {
  const { orgId } = useWorkspace();
  const { data, isLoading } = useProject(projectId);
  const update = useUpdateProject(projectId);
  const createMilestone = useCreateMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const { data: members } = useOrgMembers(orgId);
  const [milestoneName, setMilestoneName] = React.useState("");
  const [addUser, setAddUser] = React.useState("");

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading project…</p>;
  const { project, milestones, members: team, progress } = data;
  const teamUserIds = new Set(team.map((t) => t.user_id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{project.name}</h2>
          {project.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
        </div>
        <select
          value={project.status}
          onChange={(e) => update.mutate({ status: e.target.value as "active" })}
          className="rounded-md border bg-background px-2 py-1.5 text-sm capitalize"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Progress</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{progress.rate}%</div>
            <Progress value={progress.rate} />
            <p className="text-xs text-muted-foreground">{progress.done}/{progress.total} tasks complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {milestones.map((m) => (
              <button
                key={m.id}
                onClick={() => updateMilestone.mutate({ milestoneId: m.id, status: m.status === "completed" ? "open" : "completed" })}
                className="flex w-full items-center gap-2 text-left text-sm"
              >
                {m.status === "completed" ? <Check className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
                <span className={m.status === "completed" ? "text-muted-foreground line-through" : ""}>{m.name}</span>
                {m.due_date && <span className="ml-auto text-xs text-muted-foreground">{formatDate(m.due_date)}</span>}
              </button>
            ))}
            {milestones.length === 0 && <p className="text-xs text-muted-foreground">No milestones yet.</p>}
            <div className="flex gap-1 pt-1">
              <Input value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} placeholder="New milestone" className="h-8 text-sm" />
              <Button
                size="sm" variant="outline"
                onClick={async () => {
                  if (milestoneName.trim().length < 2) return;
                  await createMilestone.mutateAsync({ name: milestoneName });
                  setMilestoneName(""); toast.success("Milestone added");
                }}
              ><Plus className="size-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Team</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {team.map((t) => (
              <div key={t.user_id} className="flex items-center gap-2 text-sm">
                <PersonAvatar person={t.profile} size={22} />
                <span className="truncate">{t.profile?.full_name ?? t.profile?.email}</span>
                <Badge variant="secondary" className="ml-auto">{t.role}</Badge>
                <button onClick={() => removeMember.mutate(t.user_id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-1 pt-1">
              <select value={addUser} onChange={(e) => setAddUser(e.target.value)} className="h-8 flex-1 rounded-md border bg-background px-2 text-sm">
                <option value="">Add member…</option>
                {(members ?? []).filter((m) => !teamUserIds.has(m.user_id)).map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.profile?.full_name ?? m.profile?.email}</option>
                ))}
              </select>
              <Button
                size="sm" variant="outline"
                onClick={async () => { if (!addUser) return; await addMember.mutateAsync({ userId: addUser }); setAddUser(""); }}
              ><UserPlus className="size-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Project tasks</h3>
        <TaskBoard projectId={projectId} />
      </div>
    </div>
  );
}
