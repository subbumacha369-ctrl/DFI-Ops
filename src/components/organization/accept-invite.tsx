"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAcceptInvitation } from "@/hooks/use-invitations";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ token, userEmail }: { token: string; userEmail?: string | null }) {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const [done, setDone] = React.useState(false);
  const [mismatch, setMismatch] = React.useState(false);

  async function onAccept() {
    try {
      const res = await accept.mutateAsync(token);
      setDone(true);
      toast.success("You're in!");
      router.push(`/${res.slug}/dashboard`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not accept invitation";
      // The invite is tied to a specific email; surface a switch-account path.
      if (/different email/i.test(msg)) setMismatch(true);
      toast.error(msg);
    }
  }

  async function switchAccount() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}` as never);
  }

  if (mismatch) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          This invitation was sent to a different email than the account you&apos;re signed in
          as{userEmail ? ` (${userEmail})` : ""}. Sign in with the invited email to accept.
        </p>
        <Button className="w-full" onClick={switchAccount}>
          Use a different account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={onAccept} disabled={accept.isPending || done}>
        {accept.isPending ? "Joining…" : "Accept invitation"}
      </Button>
      {userEmail && (
        <p className="text-center text-xs text-muted-foreground">
          Signed in as {userEmail}.{" "}
          <button type="button" onClick={switchAccount} className="underline hover:text-foreground">
            Not you?
          </button>
        </p>
      )}
    </div>
  );
}
