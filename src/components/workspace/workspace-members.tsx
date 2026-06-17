"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Row = {
  user_id: string;
  role: string;
  profile: { full_name: string | null; email: string; avatar_url: string | null } | null;
};

export function WorkspaceMembers({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async (): Promise<Row[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("workspace_members")
        .select("user_id, role, profile:profiles(full_name, email, avatar_url)")
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Row[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading members…</p>;

  return (
    <div className="space-y-1">
      {data?.map((m) => (
        <div key={m.user_id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
          <Avatar className="size-8">
            <AvatarImage src={m.profile?.avatar_url ?? undefined} />
            <AvatarFallback>{initials(m.profile?.full_name, m.profile?.email)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{m.profile?.full_name ?? m.profile?.email}</p>
            <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
            {m.role}
          </span>
        </div>
      ))}
    </div>
  );
}
