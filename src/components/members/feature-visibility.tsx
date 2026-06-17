"use client";

import * as React from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useVisibility, useSetVisibility } from "@/hooks/use-admin";
import { useAccess } from "@/hooks/use-access";
import { ROLE_LABEL } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import type { AppRole } from "@/types";

export function FeatureVisibility({ orgId, widgetsOnly = false }: { orgId: string; widgetsOnly?: boolean }) {
  const { data, isLoading } = useVisibility(orgId);
  const setVis = useSetVisibility(orgId);
  const access = useAccess(orgId);
  const editable = access.can("permissions", "edit");

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading visibility settings…</p>;
  const { hidden, features, roles } = data;
  const isHidden = (role: string, key: string) => (hidden[role] ?? []).includes(key);

  const groups = [...new Set(features.map((f) => f.group))]
    .filter((g) => (widgetsOnly ? g === "Dashboard widgets" : g === "Navigation"));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {widgetsOnly
          ? "Show or hide dashboard widgets per role. Super Admin always sees everything."
          : "Hide navigation items / modules per role without changing code. Sidebar and menus adapt automatically."}
        {!editable && " (Read-only — you lack permission management rights.)"}
      </p>

      {groups.map((group) => (
        <Card key={group}>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 bg-card px-4 py-3 text-left font-medium">{group}</th>
                  {roles.map((r) => <th key={r} className="px-3 py-3 text-center text-xs font-medium">{ROLE_LABEL[r]}</th>)}
                </tr>
              </thead>
              <tbody>
                {features.filter((f) => f.group === group).map((f) => (
                  <tr key={f.key} className="border-b last:border-0">
                    <td className="sticky left-0 bg-card px-4 py-2.5 text-left">{f.label}</td>
                    {roles.map((r) => {
                      const locked = r === "super_admin";
                      const off = isHidden(r, f.key);
                      return (
                        <td key={r} className="px-3 py-2.5 text-center">
                          <button
                            disabled={!editable || locked}
                            title={locked ? "Always visible to Super Admin" : off ? "Hidden — click to show" : "Visible — click to hide"}
                            onClick={async () => {
                              try { await setVis.mutateAsync({ appRole: r as AppRole, featureKey: f.key, hidden: !off }); toast.success("Visibility updated"); }
                              catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                            }}
                            className="disabled:opacity-40"
                          >
                            {off ? <EyeOff className="mx-auto size-4 text-destructive" /> : <Eye className="mx-auto size-4 text-primary" />}
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
      ))}
    </div>
  );
}
