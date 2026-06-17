"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAcceptInvitation } from "@/hooks/use-invitations";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const [done, setDone] = React.useState(false);

  async function onAccept() {
    try {
      const res = await accept.mutateAsync(token);
      setDone(true);
      toast.success("You're in!");
      router.push(`/${res.slug}/dashboard`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept invitation");
    }
  }

  return (
    <Button className="w-full" onClick={onAccept} disabled={accept.isPending || done}>
      {accept.isPending ? "Joining…" : "Accept invitation"}
    </Button>
  );
}
