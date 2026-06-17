"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

/** Current authenticated user and their profile row. */
export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async (): Promise<{ id: string; email: string; profile: Profile | null }> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return { id: user.id, email: user.email ?? "", profile: profile ?? null };
    },
  });
}
