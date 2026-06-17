"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, FolderKanban } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_LABEL: Record<string, string> = {
  active: "Active", on_hold: "On hold", completed: "Completed", archived: "Archived",
};

export function ProjectsList() {
  const { orgSlug, workspaceId } = useWorkspace();
  const { data: projects, isLoading } = useProjects(workspaceId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Group tasks into projects with milestones, a team, and progress tracking.</p>
        <CreateProjectDialog />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading projects…</p>}
      {!isLoading && (projects ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <FolderKanban className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(projects ?? []).map((p) => {
          const rate = p.taskCount ? Math.round((p.doneCount / p.taskCount) * 100) : 0;
          return (
            <Link key={p.id} href={`/${orgSlug}/w/${workspaceId}/projects/${p.id}` as never}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Badge variant="secondary">{STATUS_LABEL[p.status] ?? p.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{p.doneCount}/{p.taskCount} tasks</span>
                      <span>{rate}%</span>
                    </div>
                    <Progress value={rate} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CreateProjectDialog() {
  const { workspaceId } = useWorkspace();
  const create = useCreateProject(workspaceId);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  async function submit() {
    if (name.trim().length < 2) return toast.error("Enter a name");
    try {
      await create.mutateAsync({ name, status: "active", description: description || undefined, dueDate: dueDate || null });
      toast.success("Project created");
      setOpen(false); setName(""); setDescription(""); setDueDate("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> New project</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-2"><Label>Target date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
