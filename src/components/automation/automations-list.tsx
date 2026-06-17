"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Play, Trash2, Zap } from "lucide-react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import {
  useAutomations, useCreateAutomation, useToggleAutomation, useDeleteAutomation, useRunAutomation,
} from "@/hooks/use-automations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const TRIGGERS = [
  { value: "task_created", label: "Task created" },
  { value: "task_status_changed", label: "Task status changed" },
  { value: "task_due_soon", label: "Task due soon" },
  { value: "task_overdue", label: "Task overdue" },
  { value: "comment_added", label: "Comment added" },
  { value: "mentioned", label: "User mentioned" },
] as const;

const ACTIONS = [
  { value: "notify", label: "Notify assignee" },
  { value: "set_priority", label: "Set priority" },
  { value: "create_followup", label: "Create follow-up task" },
  { value: "assign", label: "Assign to user" },
] as const;

const TEMPLATES = [
  { name: "Overdue reminder", triggerType: "task_overdue", actionType: "notify", desc: "Notify the assignee when a task becomes overdue." },
  { name: "Follow-up on completion", triggerType: "task_status_changed", actionType: "create_followup", desc: "Create a follow-up when work is completed." },
  { name: "Escalate critical tasks", triggerType: "task_created", actionType: "set_priority", desc: "Raise priority on newly created tasks." },
] as const;

export function AutomationsList() {
  const { workspaceId } = useWorkspace();
  const { data: rules, isLoading } = useAutomations(workspaceId);
  const toggle = useToggleAutomation(workspaceId);
  const del = useDeleteAutomation(workspaceId);
  const run = useRunAutomation();
  const create = useCreateAutomation(workspaceId);

  async function createFromTemplate(t: (typeof TEMPLATES)[number]) {
    try {
      await create.mutateAsync({
        name: t.name, triggerType: t.triggerType, trigger: {}, conditions: [],
        actions: [{ actionType: t.actionType, params: {} }], enabled: true,
      });
      toast.success("Automation created");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">No-code rules: <strong>Trigger → Conditions → Actions</strong>.</p>
        <CreateRuleDialog />
      </div>

      {/* Templates */}
      <div className="grid gap-3 sm:grid-cols-3">
        {TEMPLATES.map((t) => (
          <Card key={t.name} className="flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Zap className="size-4 text-primary" /> {t.name}</CardTitle></CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t.desc}</p>
              <Button size="sm" variant="outline" onClick={() => createFromTemplate(t)}>Use template</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rules */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Your rules</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (rules ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No rules yet.</p>}
          {(rules ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <Badge variant={r.enabled ? "default" : "secondary"}>{r.enabled ? "On" : "Off"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  When <strong>{r.trigger_type.replace(/_/g, " ")}</strong> → {r.actions.map((a) => a.action_type).join(", ") || "no actions"}
                </p>
              </div>
              <button
                onClick={() => toggle.mutate({ ruleId: r.id, enabled: !r.enabled })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {r.enabled ? "Disable" : "Enable"}
              </button>
              <Button
                size="sm" variant="outline"
                onClick={async () => {
                  const res = await run.mutateAsync(r.id);
                  toast.success(`Ran — ${res.matched} task(s) matched`);
                }}
              ><Play className="size-4" /> Run</Button>
              <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateRuleDialog() {
  const { workspaceId } = useWorkspace();
  const create = useCreateAutomation(workspaceId);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [triggerType, setTriggerType] = React.useState<(typeof TRIGGERS)[number]["value"]>("task_overdue");
  const [actionType, setActionType] = React.useState<(typeof ACTIONS)[number]["value"]>("notify");

  async function submit() {
    if (name.trim().length < 2) return toast.error("Enter a name");
    try {
      await create.mutateAsync({
        name, triggerType, trigger: {}, conditions: [],
        actions: [{ actionType, params: {} }], enabled: true,
      });
      toast.success("Automation created");
      setOpen(false); setName("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> New rule</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create automation rule</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="space-y-2">
            <Label>Trigger</Label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value as typeof triggerType)} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
              {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Action</Label>
            <select value={actionType} onChange={(e) => setActionType(e.target.value as typeof actionType)} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
              {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
