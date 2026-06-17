import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { Workspace } from "@/types";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve the org by slug. RLS ensures this returns a row only for members.
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle();

  // Not a member (or no such org) → bounce to the user's own landing.
  if (!org) redirect("/");

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("org_id", org.id)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar orgId={org.id} orgSlug={orgSlug} workspaces={(workspaces ?? []) as Workspace[]} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
