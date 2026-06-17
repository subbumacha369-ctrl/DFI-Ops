"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useCreateTask } from "@/hooks/use-tasks";
import { useOrgMembers } from "@/hooks/use-org-members";
import { useProjects } from "@/hooks/use-projects";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TaskPriority } from "@/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

export function TaskCreateDialog({ defaultStatusId, defaultProjectId }: { defaultStatusId?: string; defaultProjectId?: string }) {
  const { orgId, workspaceId } = useWorkspace();
  const create = useCreateTask(workspaceId);
  const { data: members } = useOrgMembers(orgId);
  const { data: projects } = useProjects(workspaceId);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("medium");
  const [assignedTo, setAssignedTo] = React.useState("");
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? "");
  const [dueDate, setDueDate] = React.useState("");

  async function submit() {
    if (title.trim().length < 2) return toast.error("Enter a title");
    try {
      await create.mutateAsync({
        title,
        description: description || undefined,
        priority,
        statusId: defaultStatusId,
        assignedTo: assignedTo || null,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      toast.success("Task created");
      setOpen(false);
      setTitle(""); setDescription(""); setAssignedTo(""); setDueDate(""); setPriority("medium");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create task");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> New task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional detail" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full rounded-md border bg-background px-2 py-2 text-sm capitalize">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
                <option value="">Unassigned</option>
                {(members ?? []).map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name ?? m.profile?.email}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
                <option value="">None</option>
                {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
