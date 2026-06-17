"use client";

import * as React from "react";
import { toast } from "sonner";
import { Paperclip, Plus, Trash2, X, Link2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/fetcher";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useOrgMembers } from "@/hooks/use-org-members";
import {
  useTask, useUpdateTask, useDeleteTask, useTaskComments, useAddComment, useTaskStatuses, useTasks,
} from "@/hooks/use-tasks";
import { describeRule, RECURRENCE_PRESETS } from "@/lib/recurrence";
import { formatDate, initials } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TaskPriority } from "@/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

export function TaskDetailDialog({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {taskId && <TaskDetailBody taskId={taskId} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailBody({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { orgId, workspaceId } = useWorkspace();
  const { data, isLoading } = useTask(taskId);
  const { data: statuses } = useTaskStatuses(workspaceId);
  const { data: members } = useOrgMembers(orgId);
  const { data: allTasks } = useTasks(workspaceId, { topLevel: false });
  const update = useUpdateTask(workspaceId);
  const del = useDeleteTask(workspaceId);
  const { data: comments } = useTaskComments(taskId);
  const addComment = useAddComment(taskId);

  const [desc, setDesc] = React.useState<string | null>(null);
  const [commentBody, setCommentBody] = React.useState("");
  const [mentions, setMentions] = React.useState<string[]>([]);
  const [subtaskTitle, setSubtaskTitle] = React.useState("");
  const [attachments, setAttachments] = React.useState<{ id: string; filename: string; url: string | null }[]>([]);

  const loadAttachments = React.useCallback(async () => {
    const res = await apiFetch<{ attachments: { id: string; filename: string; url: string | null }[] }>(
      `/api/tasks/${taskId}/attachments`,
    );
    setAttachments(res.attachments);
  }, [taskId]);
  React.useEffect(() => { void loadAttachments(); }, [loadAttachments]);

  if (isLoading || !data) return <p className="py-8 text-sm text-muted-foreground">Loading task…</p>;
  const task = data.task;
  const people = (members ?? []).map((m) => m.profile);

  async function patch(p: Parameters<typeof update.mutate>[0]) {
    try { await update.mutateAsync(p); } catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
  }

  async function addSubtask() {
    if (subtaskTitle.trim().length < 2) return;
    await apiFetch("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ workspaceId, title: subtaskTitle, parentTaskId: taskId }),
    });
    setSubtaskTitle("");
    toast.success("Subtask added");
  }

  async function addDependency(dependsOnId: string) {
    try {
      await apiFetch(`/api/tasks/${taskId}/dependencies`, { method: "POST", body: JSON.stringify({ dependsOnId }) });
      toast.success("Dependency added");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await apiFetch<{ upload: { path: string; token: string } }>(
        `/api/tasks/${taskId}/attachments`,
        { method: "POST", body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size }) },
      );
      const supabase = createClient();
      const { error } = await supabase.storage.from("attachments").uploadToSignedUrl(res.upload.path, res.upload.token, file);
      if (error) throw error;
      toast.success("Uploaded");
      void loadAttachments();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 pr-6">
        <input
          defaultValue={task.title}
          onBlur={(e) => e.target.value !== task.title && patch({ taskId, title: e.target.value })}
          className="w-full bg-transparent text-lg font-semibold tracking-tight outline-none"
        />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <select
            value={task.status_id}
            onChange={(e) => patch({ taskId, statusId: e.target.value })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {(statuses ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Priority</span>
          <select
            value={task.priority}
            onChange={(e) => patch({ taskId, priority: e.target.value as TaskPriority })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm capitalize"
          >
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Assignee</span>
          <select
            value={task.assigned_to ?? ""}
            onChange={(e) => patch({ taskId, assignedTo: e.target.value || null })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Due date</span>
          <input
            type="date"
            defaultValue={task.due_date ? task.due_date.slice(0, 10) : ""}
            onChange={(e) => patch({ taskId, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Recurrence</span>
        <select
          defaultValue={task.recurrence_rule ?? ""}
          onChange={(e) => patch({ taskId, recurrenceRule: e.target.value || null })}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          {RECURRENCE_PRESETS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {task.recurrence_rule && (
          <span className="text-[11px] text-muted-foreground">{describeRule(task.recurrence_rule)}</span>
        )}
      </label>

      {/* Description */}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Description</span>
        <Textarea
          value={desc ?? task.description ?? ""}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => desc !== null && desc !== task.description && patch({ taskId, description: desc })}
          placeholder="Add detail…"
        />
      </div>

      {/* Subtasks */}
      <Section title="Subtasks">
        <div className="space-y-1">
          {data.subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
              <span className={s.completed_at ? "text-muted-foreground line-through" : ""}>{s.title}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} placeholder="New subtask" />
          <Button size="sm" variant="outline" onClick={addSubtask}><Plus className="size-4" /></Button>
        </div>
      </Section>

      {/* Dependencies */}
      <Section title="Dependencies">
        <div className="space-y-1">
          {data.dependencies.map((d) => {
            const dep = (allTasks ?? []).find((t) => t.id === d.depends_on_id);
            return (
              <div key={d.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
                <Link2 className="size-3.5 text-muted-foreground" />
                <span className="capitalize text-muted-foreground">{d.type}</span>
                <span className="truncate">{dep?.title ?? d.depends_on_id}</span>
              </div>
            );
          })}
        </div>
        <select
          onChange={(e) => { if (e.target.value) { void addDependency(e.target.value); e.target.value = ""; } }}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          defaultValue=""
        >
          <option value="">Add a dependency…</option>
          {(allTasks ?? []).filter((t) => t.id !== taskId).map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </Section>

      {/* Attachments */}
      <Section title="Attachments">
        <div className="space-y-1">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
              <Paperclip className="size-3.5 text-muted-foreground" />
              {a.url ? <a href={a.url} target="_blank" rel="noreferrer" className="truncate hover:underline">{a.filename}</a> : <span className="truncate">{a.filename}</span>}
            </div>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Paperclip className="size-4" /> Attach file
          <input type="file" className="hidden" onChange={onFile} />
        </label>
      </Section>

      {/* Comments */}
      <Section title="Comments">
        <div className="space-y-3">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="size-7">
                <AvatarImage src={c.author?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{initials(c.author?.full_name, c.author?.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.author?.full_name ?? c.author?.email}</span> · {formatDate(c.created_at)}
                </p>
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              </div>
            </div>
          ))}
          {(comments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        </div>
        <div className="space-y-2">
          {people.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {people.map((p) => {
                const on = mentions.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setMentions((m) => on ? m.filter((x) => x !== p.id) : [...m, p.id])}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  >
                    @{(p.full_name ?? p.email ?? "").split(" ")[0]}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment… select names above to mention"
              className="min-h-[40px]"
            />
            <Button
              size="sm"
              disabled={addComment.isPending || commentBody.trim().length === 0}
              onClick={async () => {
                await addComment.mutateAsync({ body: commentBody, mentions });
                setCommentBody(""); setMentions([]);
              }}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </Section>

      <div className="flex items-center justify-between border-t pt-3">
        <Button
          variant="ghost" size="sm" className="text-destructive"
          onClick={async () => { await del.mutateAsync(taskId); toast.success("Task deleted"); onClose(); }}
        >
          <Trash2 className="size-4" /> Delete task
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}><X className="size-4" /> Close</Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
