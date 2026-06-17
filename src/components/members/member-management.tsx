"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, UserPlus, MoreHorizontal, ShieldOff, ShieldCheck, Trash2, Copy, RotateCw } from "lucide-react";
import {
  useMembers, useDepartments, useTeams, useUpdateMember, useRemoveMember, useSetMemberStatus,
} from "@/hooks/use-members";
import { useMyRole } from "@/hooks/use-rbac";
import { useInvitations, useInviteMember, useRevokeInvitation, useResendInvitation } from "@/hooks/use-invitations";
import { ROLE_LABEL, assignableRoles } from "@/lib/rbac";
import { formatDate, copyToClipboard } from "@/lib/utils";
import { PersonAvatar } from "@/components/work/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MemberDirectoryRow, AppRole, MemberStatus } from "@/types";

const STATUS_BADGE: Record<MemberStatus, "default" | "secondary" | "destructive"> = {
  active: "default", suspended: "destructive", invited: "secondary",
};

export function MemberManagement({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { data: members, isLoading } = useMembers(orgId);
  const { can, appRole } = useMyRole(orgId);
  const { data: depts } = useDepartments(orgId);
  const status = useSetMemberStatus(orgId);
  const remove = useRemoveMember(orgId);

  const [q, setQ] = React.useState("");
  const [fStatus, setFStatus] = React.useState("all");
  const [fRole, setFRole] = React.useState("all");
  const [fDept, setFDept] = React.useState("all");
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const [edit, setEdit] = React.useState<MemberDirectoryRow | null>(null);

  const manage = can("members.manage");

  const filtered = (members ?? []).filter((m) => {
    const name = (m.profile?.full_name ?? m.profile?.email ?? "").toLowerCase();
    if (q && !name.includes(q.toLowerCase()) && !(m.employee_id ?? "").toLowerCase().includes(q.toLowerCase())) return false;
    if (fStatus !== "all" && m.status !== fStatus) return false;
    if (fRole !== "all" && m.app_role !== fRole) return false;
    if (fDept !== "all" && m.department_id !== fDept) return false;
    return true;
  });

  function toggle(id: string) {
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  async function bulk(action: "suspend" | "activate" | "remove") {
    for (const userId of sel) {
      if (action === "remove") await remove.mutateAsync(userId);
      else await status.mutateAsync({ userId, status: action === "suspend" ? "suspended" : "active" });
    }
    toast.success(`Bulk ${action} applied to ${sel.size} member(s)`);
    setSel(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="spread flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Add, invite, search, and manage everyone in the organization.</p>
        {can("members.invite") && <InviteDialog orgId={orgId} />}
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invites">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          {/* filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or employee ID…" className="pl-8" />
            </div>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-md border bg-background px-2 py-2 text-sm">
              <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="invited">Invited</option>
            </select>
            <select value={fRole} onChange={(e) => setFRole(e.target.value)} className="rounded-md border bg-background px-2 py-2 text-sm">
              <option value="all">All roles</option>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={fDept} onChange={(e) => setFDept(e.target.value)} className="rounded-md border bg-background px-2 py-2 text-sm">
              <option value="all">All departments</option>
              {(depts ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* bulk bar */}
          {manage && sel.size > 0 && (
            <div className="mb-2 flex items-center gap-2 rounded-md border bg-accent/40 px-3 py-2 text-sm">
              <span>{sel.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulk("activate")}>Activate</Button>
              <Button size="sm" variant="outline" onClick={() => bulk("suspend")}>Suspend</Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => bulk("remove")}>Remove</Button>
            </div>
          )}

          <Card>
            {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading members…</div>}
            {!isLoading && filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No members match.</div>}
            {filtered.map((m) => (
              <div key={m.id} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0 hover:bg-muted/40">
                {manage && <input type="checkbox" className="size-4" checked={sel.has(m.user_id)} onChange={() => toggle(m.user_id)} />}
                <PersonAvatar person={m.profile} size={30} />
                <Link href={`/${orgSlug}/members/${m.user_id}` as never} className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium hover:underline">{m.profile?.full_name ?? m.profile?.email}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.designation ?? m.profile?.email} · {m.employee_id ?? "—"}</div>
                </Link>
                <span className="hidden text-xs text-muted-foreground sm:block">{m.department?.name ?? "—"}</span>
                <Badge variant="secondary">{ROLE_LABEL[m.app_role]}</Badge>
                <Badge variant={STATUS_BADGE[m.status]}>{m.status}</Badge>
                {manage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEdit(m)}>Edit profile</DropdownMenuItem>
                      {m.status !== "suspended"
                        ? <DropdownMenuItem onClick={() => status.mutate({ userId: m.user_id, status: "suspended" })}><ShieldOff className="size-4" /> Suspend</DropdownMenuItem>
                        : <DropdownMenuItem onClick={() => status.mutate({ userId: m.user_id, status: "active" })}><ShieldCheck className="size-4" /> Activate</DropdownMenuItem>}
                      <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Remove this member?")) remove.mutate(m.user_id); }}><Trash2 className="size-4" /> Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <PendingInvites orgId={orgId} canManage={can("members.invite")} />
        </TabsContent>
      </Tabs>

      {edit && <EditMemberDialog orgId={orgId} member={edit} actorRole={appRole} onClose={() => setEdit(null)} />}
    </div>
  );
}

function InviteDialog({ orgId }: { orgId: string }) {
  const invite = useInviteMember(orgId);
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [link, setLink] = React.useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEmail(""); setLink(null); } }}>
      <DialogTrigger asChild><Button size="sm"><UserPlus className="size-4" /> Invite / Add member</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a member</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" /></div>
          <p className="text-xs text-muted-foreground">They join as a pending member. Activate them and assign a role from the Members list after they accept.</p>
          {link && (
            <div className="space-y-1">
              <Label>Invite link</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" variant="outline" onClick={async () => { const ok = await copyToClipboard(link); if (ok) toast.success("Link copied"); else toast.error("Could not copy"); }}>Copy</Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button disabled={invite.isPending || !email} onClick={async () => {
            try {
              const r = await invite.mutateAsync({ email, role: "member" });
              if (r.emailSent) { toast.success(`Invitation emailed to ${email}`); setOpen(false); setEmail(""); }
              else { toast.message("Invitation created — copy the link to share"); setLink(r.acceptUrl); }
            }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}>{invite.isPending ? "Sending…" : "Send invitation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingInvites({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const { data: invites, isLoading } = useInvitations(orgId);
  const revoke = useRevokeInvitation(orgId);
  const resend = useResendInvitation(orgId);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!invites?.length) return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No invitations yet.</CardContent></Card>;

  async function copyLink(url: string) {
    const ok = await copyToClipboard(url);
    if (ok) toast.success("Invite link copied");
    else toast.error("Could not copy");
  }
  async function doResend(id: string) {
    try {
      const r = await resend.mutateAsync(id);
      toast.success(r.emailSent ? `Re-sent to ${r.invitation.email}` : "Invitation re-armed — copy the link to share");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not resend"); }
  }

  return (
    <Card>{invites.map((inv) => {
      const open = inv.status === "pending" || inv.status === "expired";
      return (
        <div key={inv.id} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0">
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{inv.email}</div><div className="text-xs text-muted-foreground">{inv.status === "expired" ? "expired" : "expires"} {formatDate(inv.expires_at)}</div></div>
          <Badge variant={inv.status === "accepted" ? "default" : "secondary"} className="capitalize">{inv.status}</Badge>
          {canManage && open && inv.acceptUrl && (
            <Button variant="ghost" size="icon" className="size-8" aria-label="Copy invite link" onClick={() => copyLink(inv.acceptUrl!)}><Copy className="size-4" /></Button>
          )}
          {canManage && open && (
            <Button variant="ghost" size="icon" className="size-8" aria-label="Resend invitation" disabled={resend.isPending} onClick={() => doResend(inv.id)}><RotateCw className="size-4" /></Button>
          )}
          {canManage && inv.status === "pending" && <Button variant="ghost" size="sm" onClick={() => revoke.mutate(inv.id)}>Revoke</Button>}
        </div>
      );
    })}</Card>
  );
}

export function EditMemberDialog({ orgId, member, actorRole, onClose }: {
  orgId: string; member: MemberDirectoryRow; actorRole: AppRole | null; onClose: () => void;
}) {
  const update = useUpdateMember(orgId);
  const { data: members } = useMembers(orgId);
  const { data: depts } = useDepartments(orgId);
  const { data: teams } = useTeams(orgId);
  const [f, setF] = React.useState({
    appRole: member.app_role, employeeId: member.employee_id ?? "", designation: member.designation ?? "",
    departmentId: member.department_id ?? "", teamId: member.team_id ?? "",
    reportingOfficerId: member.reporting_officer_id ?? "", joinDate: member.join_date ?? "",
  });
  const roles = assignableRoles(actorRole);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit — {member.profile?.full_name ?? member.profile?.email}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1"><Label>Employee ID</Label><Input value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })} /></div>
          <div className="space-y-1"><Label>Designation</Label><Input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></div>
          <div className="space-y-1"><Label>Role</Label>
            <select value={f.appRole} onChange={(e) => setF({ ...f, appRole: e.target.value as AppRole })} className="w-full rounded-md border bg-background px-2 py-2 text-sm" disabled={roles.length === 0}>
              <option value={member.app_role}>{ROLE_LABEL[member.app_role]}</option>
              {roles.filter((r) => r !== member.app_role).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Join date</Label><Input type="date" value={f.joinDate} onChange={(e) => setF({ ...f, joinDate: e.target.value })} /></div>
          <div className="space-y-1"><Label>Department</Label>
            <select value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
              <option value="">—</option>{(depts ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Team</Label>
            <select value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
              <option value="">—</option>{(teams ?? []).map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-1"><Label>Reporting officer</Label>
            <select value={f.reportingOfficerId} onChange={(e) => setF({ ...f, reportingOfficerId: e.target.value })} className="w-full rounded-md border bg-background px-2 py-2 text-sm">
              <option value="">—</option>
              {(members ?? []).filter((m) => m.user_id !== member.user_id).map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name ?? m.profile?.email}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            try {
              await update.mutateAsync({
                userId: member.user_id, appRole: f.appRole, employeeId: f.employeeId || null,
                designation: f.designation || null, departmentId: f.departmentId || null, teamId: f.teamId || null,
                reportingOfficerId: f.reportingOfficerId || null, joinDate: f.joinDate || null,
              });
              toast.success("Member updated"); onClose();
            } catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
          }} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
