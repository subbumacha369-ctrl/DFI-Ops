"use client";

import * as React from "react";
import Link from "next/link";
import { useMembers, useDepartments, useTeams } from "@/hooks/use-members";
import { ROLE_LABEL } from "@/lib/rbac";
import { PersonAvatar } from "@/components/work/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { MemberDirectoryRow } from "@/types";

export function OrgHierarchy({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { data: members, isLoading } = useMembers(orgId);
  const { data: depts } = useDepartments(orgId);
  const { data: teams } = useTeams(orgId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading organization…</p>;
  const all = members ?? [];
  const childrenOf = (id: string | null) => all.filter((m) => m.reporting_officer_id === id);
  const roots = all.filter((m) => !m.reporting_officer_id || !all.some((x) => x.user_id === m.reporting_officer_id));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Reporting lines, departments, and teams across the organization.</p>
      <Tabs defaultValue="tree">
        <TabsList>
          <TabsTrigger value="tree">Reporting hierarchy</TabsTrigger>
          <TabsTrigger value="depts">Departments &amp; teams</TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <Card><CardContent className="p-5">
            {roots.map((r) => <Node key={r.user_id} member={r} childrenOf={childrenOf} orgSlug={orgSlug} depth={0} />)}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="depts">
          <div className="grid gap-4 md:grid-cols-2">
            {(depts ?? []).map((d) => {
              const dteams = (teams ?? []).filter((tm) => tm.department_id === d.id);
              const dmembers = all.filter((m) => m.department_id === d.id);
              return (
                <Card key={d.id}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{d.name}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">{dmembers.length} member(s) · {dteams.length} team(s)</p>
                    {dteams.map((tm) => (
                      <div key={tm.id}>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tm.name}</div>
                        <div className="space-y-1">
                          {all.filter((m) => m.team_id === tm.id).map((m) => (
                            <Link key={m.user_id} href={`/${orgSlug}/members/${m.user_id}` as never} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                              <PersonAvatar person={m.profile} size={20} /> {m.profile?.full_name ?? m.profile?.email}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
            {(depts ?? []).length === 0 && <p className="text-sm text-muted-foreground">No departments yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Node({ member, childrenOf, orgSlug, depth }: {
  member: MemberDirectoryRow; childrenOf: (id: string | null) => MemberDirectoryRow[]; orgSlug: string; depth: number;
}) {
  const kids = childrenOf(member.user_id);
  return (
    <div style={{ marginLeft: depth ? 20 : 0 }} className={depth ? "border-l pl-4" : ""}>
      <Link href={`/${orgSlug}/members/${member.user_id}` as never} className="my-1 flex items-center gap-2 rounded-md border px-3 py-2 hover:border-primary/40">
        <PersonAvatar person={member.profile} size={28} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{member.profile?.full_name ?? member.profile?.email}</div>
          <div className="truncate text-xs text-muted-foreground">{member.designation ?? "—"}</div>
        </div>
        <Badge variant="secondary" className="ml-auto">{ROLE_LABEL[member.app_role]}</Badge>
      </Link>
      {kids.map((k) => <Node key={k.user_id} member={k} childrenOf={childrenOf} orgSlug={orgSlug} depth={depth + 1} />)}
    </div>
  );
}
