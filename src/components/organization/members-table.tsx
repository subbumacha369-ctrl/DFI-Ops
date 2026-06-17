"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, MoreHorizontal, RotateCw } from "lucide-react";
import { useOrgMembers, useUpdateMemberRole, useRemoveMember } from "@/hooks/use-org-members";
import {
  useInvitations,
  useRevokeInvitation,
  useResendInvitation,
  type InvitationStatus,
} from "@/hooks/use-invitations";
import { initials, formatDate, copyToClipboard } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrgRole } from "@/types";

const ASSIGNABLE: OrgRole[] = ["admin", "member", "guest"];

const STATUS_STYLE: Record<InvitationStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "bg-muted text-muted-foreground",
  revoked: "bg-muted text-muted-foreground line-through",
};

export function MembersTable({ orgId, currentUserId }: { orgId: string; currentUserId: string }) {
  const members = useOrgMembers(orgId);
  const invitations = useInvitations(orgId);
  const updateRole = useUpdateMemberRole(orgId);
  const removeMember = useRemoveMember(orgId);
  const revoke = useRevokeInvitation(orgId);
  const resend = useResendInvitation(orgId);

  async function copyLink(url: string) {
    const ok = await copyToClipboard(url);
    if (ok) toast.success("Invite link copied");
    else toast.error("Could not copy");
  }

  async function resendInvite(id: string) {
    try {
      const res = await resend.mutateAsync(id);
      toast.success(
        res.emailSent ? `Invitation re-sent to ${res.invitation.email}` : "Invitation re-armed — copy the link to share",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend");
    }
  }

  async function revokeInvite(id: string) {
    try {
      await revoke.mutateAsync(id);
      toast.success("Invitation revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke");
    }
  }

  async function changeRole(userId: string, role: OrgRole) {
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success("Role updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update role");
    }
  }

  async function remove(userId: string) {
    try {
      await removeMember.mutateAsync(userId);
      toast.success("Member removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove member");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {members.isLoading && <p className="text-sm text-muted-foreground">Loading members…</p>}
          {members.data?.map((m) => {
            const isSelf = m.user_id === currentUserId;
            const isOwner = m.role === "owner";
            return (
              <div key={m.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(m.profile?.full_name, m.profile?.email)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {m.profile?.full_name ?? m.profile?.email}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
                    {m.role}
                  </span>
                  {!isOwner && !isSelf && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change role</DropdownMenuLabel>
                        {ASSIGNABLE.map((r) => (
                          <DropdownMenuItem
                            key={r}
                            className="capitalize"
                            onClick={() => changeRole(m.user_id, r)}
                          >
                            {r}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => remove(m.user_id)}
                        >
                          Remove from org
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {!!invitations.data?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {invitations.data.map((inv) => {
              const open = inv.status === "pending" || inv.status === "expired";
              return (
                <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {inv.role} ·{" "}
                      {inv.status === "expired"
                        ? `expired ${formatDate(inv.expires_at)}`
                        : `expires ${formatDate(inv.expires_at)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[inv.status]}`}>
                      {inv.status}
                    </span>
                    {open && inv.acceptUrl && (
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Copy invite link" onClick={() => copyLink(inv.acceptUrl!)}>
                        <Copy className="size-4" />
                      </Button>
                    )}
                    {open && (
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Resend invitation" disabled={resend.isPending} onClick={() => resendInvite(inv.id)}>
                        <RotateCw className="size-4" />
                      </Button>
                    )}
                    {inv.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
