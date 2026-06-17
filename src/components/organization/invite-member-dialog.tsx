"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/validations/organization";
import { useInviteMember } from "@/hooks/use-invitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const ROLES = ["admin", "member", "guest"] as const;

export function InviteMemberDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = React.useState(false);
  const invite = useInviteMember(orgId);
  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  });

  async function onSubmit(values: InviteMemberInput) {
    try {
      const res = await invite.mutateAsync(values);
      toast.success(
        res.emailSent ? "Invitation sent" : "Invitation created (email not configured)",
      );
      form.reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not invite");
    }
  }

  const role = form.watch("role");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" /> Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              They&apos;ll get an email link to join this organization.
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

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-2">
                {ROLES.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={role === r ? "default" : "outline"}
                    onClick={() => form.setValue("role", r)}
                    className="capitalize"
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
