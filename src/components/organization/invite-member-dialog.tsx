"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Copy, UserPlus } from "lucide-react";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/validations/organization";
import { useInviteMember, type InviteResult } from "@/hooks/use-invitations";
import { copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export function InviteMemberDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = React.useState(false);
  const [result, setResult] = React.useState<InviteResult | null>(null);
  const invite = useInviteMember(orgId);
  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  });

  function reset() {
    form.reset();
    setResult(null);
  }

  async function onSubmit(values: InviteMemberInput) {
    try {
      const res = await invite.mutateAsync(values);
      if (res.emailSent) {
        toast.success(`Invitation emailed to ${res.invitation.email}`);
        reset();
        setOpen(false);
      } else {
        // Email isn't configured/failed — keep the dialog open and offer the link.
        toast.message("Invitation created — share the link below");
        setResult(res);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not invite");
    }
  }

  async function copyLink() {
    if (!result) return;
    const ok = await copyToClipboard(result.acceptUrl);
    if (ok) toast.success("Link copied");
    else toast.error("Could not copy");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" /> Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation created</DialogTitle>
              <DialogDescription>
                Email delivery isn&apos;t configured{result.emailError ? " (or failed)" : ""}, so share
                this link with {result.invitation.email} directly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <Input readOnly value={result.acceptUrl} onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The link is unique to {result.invitation.email} and expires in 14 days.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={reset}>
                Invite another
              </Button>
              <Button type="button" onClick={() => { reset(); setOpen(false); }}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Invite a member</DialogTitle>
              <DialogDescription>
                They&apos;ll get a link to join this organization. You can activate them
                and assign a role once they&apos;ve joined.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="teammate@company.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
