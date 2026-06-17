import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { FeatureVisibility } from "@/components/members/feature-visibility";

export default async function VisibilityPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) redirect("/");

  return (
    <>
      <AppTopbar title="Feature visibility" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <FeatureVisibility orgId={org.id} />
        </div>
      </div>
    </>
  );
}
