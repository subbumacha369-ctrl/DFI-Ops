"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMembers, useSetMemberRole } from "@/hooks/use-members";
import { useMyRole } from "@/hooks/use-rbac";
import { ROLE_LABEL, ROLE_ORDER, assignableRoles, can } from "@/lib/rbac";
import { PersonAvatar } from "@/components/work/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/types";

export function RoleManagement({ orgId }: { orgId: string }) {
  const { data: members, isLoading } = useMembers(orgId);
  const { appRole } = useMyRole(orgId);
  const setRole = useSetMemberRole(orgId);
  const editable = can(appRole, "permissions.manage");
  const allowed = assignableRoles(appRole);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Assign functional roles. You can grant roles up to your own level.</p>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ROLE_ORDER.map((r) => (
          <Card key={r}><CardContent className="p-3 text-center">
            <div className="text-lg font-semibold">{(members ?? []).filter((m) => m.app_role === r).length}</div>
            <div className="text-xs text-muted-foreground">{ROLE_LABEL[r]}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Member roles</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0">
              <PersonAvatar person={m.profile} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.profile?.full_name ?? m.profile?.email}</div>
                <div className="truncate text-xs text-muted-foreground">{m.designation ?? "—"}</div>
              </div>
              {editable && allowed.length > 0 ? (
                <select
                  value={m.app_role}
                  onChange={async (e) => {
                    try { await setRole.mutateAsync({ userId: m.user_id, appRole: e.target.value as AppRole }); toast.success("Role updated"); }
                    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
                  }}
                  className="rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  <option value={m.app_role}>{ROLE_LABEL[m.app_role]}</option>
                  {allowed.filter((r) => r !== m.app_role).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              ) : (
                <Badge variant="secondary">{ROLE_LABEL[m.app_role]}</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
