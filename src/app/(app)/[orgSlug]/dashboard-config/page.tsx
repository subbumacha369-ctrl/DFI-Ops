import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { FeatureVisibility } from "@/components/members/feature-visibility";

export default async function DashboardConfigPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) redirect("/");

  return (
    <>
      <AppTopbar title="Dashboard configuration" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose which dashboard widgets each role sees. Hidden widgets are removed from that role&apos;s dashboard in real time.
          </p>
          <FeatureVisibility orgId={org.id} widgetsOnly />
        </div>
      </div>
    </>
  );
}
