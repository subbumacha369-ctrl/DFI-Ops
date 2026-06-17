import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Button } from "@/components/ui/button";
import { RoleManagement } from "@/components/members/role-management";

export default async function RolesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) redirect("/");

  return (
    <>
      <AppTopbar
        title="Role management"
        actions={<Button asChild variant="outline" size="sm"><Link href={`/${orgSlug}/permissions` as never}>Permission matrix</Link></Button>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <RoleManagement orgId={org.id} />
        </div>
      </div>
    </>
  );
}
