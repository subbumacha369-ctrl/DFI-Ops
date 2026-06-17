import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ActivityFeed } from "@/components/activity/activity-feed";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) redirect("/");

  return (
    <>
      <AppTopbar title="Activity" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Everything happening across the organization — task creation, updates, status changes,
            comments, and project changes.
          </p>
          <ActivityFeed orgId={org.id} />
        </div>
      </div>
    </>
  );
}
