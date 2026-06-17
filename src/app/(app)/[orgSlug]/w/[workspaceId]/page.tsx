import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceMembers } from "@/components/workspace/workspace-members";

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string; workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, description, icon")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!workspace) notFound();

  // Show the seeded task workflow so the configured pipeline is visible day one.
  const { data: statuses } = await supabase
    .from("task_statuses" as never)
    .select("name, category, color, position")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  const workflow = (statuses ?? []) as unknown as {
    name: string;
    category: string;
    color: string;
  }[];

  return (
    <>
      <AppTopbar title={`${workspace.icon ?? ""} ${workspace.name}`.trim()} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {workspace.description && (
            <p className="text-sm text-muted-foreground">{workspace.description}</p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {workflow.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                These statuses are configurable per workspace. Tasks, projects, and views
                attach to this workflow in the work-management module.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkspaceMembers workspaceId={workspaceId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
