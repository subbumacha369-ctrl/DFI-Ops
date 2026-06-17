"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Lock } from "lucide-react";
import { usePermissionMatrix, useSetPermission } from "@/hooks/use-admin";
import { useAccess } from "@/hooks/use-access";
import { ROLE_LABEL } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/types";

export function DynamicPermissionMatrix({ orgId }: { orgId: string }) {
  const { data, isLoading } = usePermissionMatrix(orgId);
  const setPerm = useSetPermission(orgId);
  const access = useAccess(orgId);
  const editable = access.can("permissions", "edit");
  const [cell, setCell] = React.useState<{ role: AppRole; module: string; label: string } | null>(null);

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading permission matrix…</p>;
  const { effective, modules, actions, roles } = data;

  const summary = (role: string, moduleKey: string) => {
    const grants = actions.filter((a) => effective[role]?.[moduleKey]?.[a]);
    if (grants.length === 0) return "No";
    if (grants.length === actions.length) return "Full";
    if (grants.length === 1 && grants[0] === "view") return "View";
    return `${grants.length}×`;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Modules × roles. {editable ? "Click a cell to edit the actions granted to that role." : "Read-only — you lack permission management rights."}
        {" "}Changes are recorded in the audit log and applied immediately.
      </p>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-4 py-3 text-left font-medium">Module</th>
                {roles.map((r) => <th key={r} className="px-3 py-3 text-center text-xs font-medium">{ROLE_LABEL[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod.key} className="border-b last:border-0">
                  <td className="sticky left-0 bg-card px-4 py-2.5 text-left font-medium">{mod.label}</td>
                  {roles.map((r) => {
                    const s = summary(r, mod.key);
                    const locked = r === "super_admin";
                    const variant = s === "Full" ? "default" : s === "No" ? "destructive" : "secondary";
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        <button
                          disabled={!editable || locked}
                          onClick={() => setCell({ role: r, module: mod.key, label: mod.label })}
                          className="inline-flex items-center gap-1 disabled:cursor-default"
                          title={locked ? "Super Admin always has full access" : editable ? "Edit" : "Read-only"}
                        >
                          {locked ? <Lock className="size-3 text-muted-foreground" /> : null}
                          <Badge variant={variant}>{s}</Badge>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {cell && (
        <Dialog open onOpenChange={(o) => !o && setCell(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{ROLE_LABEL[cell.role]} · {cell.label}</DialogTitle></DialogHeader>
            <div className="space-y-1">
              {actions.map((a) => {
                const on = !!effective[cell.role]?.[cell.module]?.[a];
                return (
                  <label key={a} className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm capitalize hover:bg-muted/50">
                    <span>{a}</span>
                    <input
                      type="checkbox" checked={on}
                      onChange={async (e) => {
                        try {
                          await setPerm.mutateAsync({ appRole: cell.role, module: cell.module, action: a, allowed: e.target.checked });
                          toast.success("Permission updated");
                        } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
                      }}
                      className="size-4"
                    />
                    {on ? <Check className="hidden" /> : null}
                  </label>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
