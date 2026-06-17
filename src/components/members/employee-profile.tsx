"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, ChevronRight } from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import { useMyRole } from "@/hooks/use-rbac";
import { ROLE_LABEL } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { PersonAvatar } from "@/components/work/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditMemberDialog } from "./member-management";
import type { MemberDirectoryRow } from "@/types";

export function EmployeeProfile({ orgId, orgSlug, userId }: { orgId: string; orgSlug: string; userId: string }) {
  const { data: members, isLoading } = useMembers(orgId);
  const { can, appRole } = useMyRole(orgId);
  const [editing, setEditing] = React.useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  const member = (members ?? []).find((m) => m.user_id === userId);
  if (!member) return <p className="text-sm text-muted-foreground">Member not found.</p>;

  // Reporting chain (top → this member).
  const byId = new Map((members ?? []).map((m) => [m.user_id, m]));
  const chain: MemberDirectoryRow[] = [];
  let cur = member.reporting_officer_id;
  const guard = new Set<string>();
  while (cur && byId.has(cur) && !guard.has(cur)) { guard.add(cur); chain.unshift(byId.get(cur)!); cur = byId.get(cur)!.reporting_officer_id; }
  const directReports = (members ?? []).filter((m) => m.reporting_officer_id === userId);

  const field = (label: string, value: React.ReactNode) => (
    <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-sm">{value ?? "—"}</div></div>
  );

  return (
    <div className="space-y-5">
      <Link href={`/${orgSlug}/members` as never} className="text-sm text-muted-foreground hover:text-foreground">← All members</Link>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <PersonAvatar person={member.profile} size={56} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{member.profile?.full_name ?? member.profile?.email}</h2>
            <p className="text-sm text-muted-foreground">{member.designation ?? "—"}</p>
          </div>
          <Badge variant="secondary">{ROLE_LABEL[member.app_role]}</Badge>
          <Badge variant={member.status === "active" ? "default" : member.status === "suspended" ? "destructive" : "secondary"}>{member.status}</Badge>
          {can("members.manage") && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</Button>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Employee details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {field("Employee ID", member.employee_id)}
            {field("Email", member.profile?.email)}
            {field("Phone", member.profile?.phone)}
            {field("Department", member.department?.name)}
            {field("Team", member.team?.name)}
            {field("Join date", member.join_date ? formatDate(member.join_date) : "—")}
            {field("Tenancy role", member.role)}
            {field("Functional role", ROLE_LABEL[member.app_role])}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Reporting</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Reporting chain</div>
              <div className="flex flex-wrap items-center gap-1 text-sm">
                {chain.map((c) => (
                  <span key={c.user_id} className="flex items-center gap-1">
                    <Link href={`/${orgSlug}/members/${c.user_id}` as never} className="rounded bg-muted px-2 py-0.5 hover:underline">{c.profile?.full_name ?? c.profile?.email}</Link>
                    <ChevronRight className="size-3 text-muted-foreground" />
                  </span>
                ))}
                <span className="rounded bg-accent px-2 py-0.5 font-medium text-accent-foreground">{member.profile?.full_name ?? "This member"}</span>
                {chain.length === 0 && <span className="text-muted-foreground">Top of hierarchy</span>}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Direct reports ({directReports.length})</div>
              <div className="space-y-1">
                {directReports.map((r) => (
                  <Link key={r.user_id} href={`/${orgSlug}/members/${r.user_id}` as never} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                    <PersonAvatar person={r.profile} size={22} /> {r.profile?.full_name ?? r.profile?.email}
                    <span className="ml-auto text-xs text-muted-foreground">{r.designation ?? ""}</span>
                  </Link>
                ))}
                {directReports.length === 0 && <p className="text-sm text-muted-foreground">No direct reports.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {editing && <EditMemberDialog orgId={orgId} member={member} actorRole={appRole} onClose={() => setEditing(false)} />}
    </div>
  );
}
