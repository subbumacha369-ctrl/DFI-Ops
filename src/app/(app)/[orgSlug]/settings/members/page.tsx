import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MembersTable } from "@/components/organization/members-table";
import { InviteMemberDialog } from "@/components/organization/invite-member-dialog";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) redirect("/");

  // Only owners/admins can invite — don't show the button to members.
  const { data: me } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const canInvite = !!me && ["owner", "admin"].includes(me.role);

  return (
    <>
      <AppTopbar title="Members" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Team members</h2>
              <p className="text-sm text-muted-foreground">
                Manage who belongs to this organization and their roles.
              </p>
            </div>
            {canInvite && <InviteMemberDialog orgId={org.id} />}
          </div>
          <MembersTable orgId={org.id} currentUserId={user.id} />
        </div>
      </div>
    </>
  );
}
