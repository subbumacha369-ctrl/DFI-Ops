import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { OrgSettingsForm } from "@/components/organization/org-settings-form";
import type { Organization } from "@/types";

export default async function OrgGeneralSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) redirect("/");

  return (
    <>
      <AppTopbar title="Organization settings" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">General</h2>
            <p className="text-sm text-muted-foreground">
              Update your organization&apos;s name and locale. Changes apply for everyone.
            </p>
          </div>
          <OrgSettingsForm org={org as Organization} />
        </div>
      </div>
    </>
  );
}
