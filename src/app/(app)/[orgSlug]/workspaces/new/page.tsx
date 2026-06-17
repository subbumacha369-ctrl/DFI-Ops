import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";

export default async function NewWorkspacePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) redirect("/");

  return (
    <>
      <AppTopbar title="New workspace" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 text-sm text-muted-foreground">
            Workspaces hold projects and tasks for a team, program, or initiative.
            You&apos;ll be added as its admin.
          </p>
          <CreateWorkspaceForm orgId={org.id} orgSlug={orgSlug} />
        </div>
      </div>
    </>
  );
}
