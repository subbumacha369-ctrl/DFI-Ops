import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { EmployeeProfile } from "@/components/members/employee-profile";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string; userId: string }>;
}) {
  const { orgSlug, userId } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) redirect("/");

  return (
    <>
      <AppTopbar title="Employee profile" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <EmployeeProfile orgId={org.id} orgSlug={orgSlug} userId={userId} />
        </div>
      </div>
    </>
  );
}
