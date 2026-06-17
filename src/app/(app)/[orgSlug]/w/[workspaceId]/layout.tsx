import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; workspaceId: string }>;
}) {
  const { orgSlug, workspaceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations").select("id, slug").eq("slug", orgSlug).maybeSingle();
  if (!org) redirect("/");

  const { data: workspace } = await supabase
    .from("workspaces").select("id, name").eq("id", workspaceId).maybeSingle();
  if (!workspace) notFound();

  return (
    <WorkspaceProvider
      value={{ orgId: org.id, orgSlug, workspaceId, workspaceName: workspace.name }}
    >
      {children}
    </WorkspaceProvider>
  );
}
