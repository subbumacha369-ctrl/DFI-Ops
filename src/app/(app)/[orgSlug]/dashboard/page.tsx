import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Boxes, Mail, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) redirect("/");

  // Real counts — these queries run under RLS, scoped to the caller's org.
  const [{ count: workspaceCount }, { count: memberCount }, { count: pendingInvites }, { data: workspaces }] =
    await Promise.all([
      supabase.from("workspaces").select("id", { count: "exact", head: true }).eq("org_id", org.id).is("archived_at", null),
      supabase.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabase.from("org_invitations").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "pending"),
      supabase.from("workspaces").select("id, name").eq("org_id", org.id).is("archived_at", null),
    ]);

  const stats = [
    { label: "Workspaces", value: workspaceCount ?? 0, icon: Boxes, href: `/${orgSlug}/workspaces/new` },
    { label: "Members", value: memberCount ?? 0, icon: Users, href: `/${orgSlug}/settings/members` },
    { label: "Pending invites", value: pendingInvites ?? 0, icon: Mail, href: `/${orgSlug}/settings/members` },
  ];

  return (
    <>
      <AppTopbar title={org.name} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Manager dashboard — {org.name}</h2>
            <p className="text-sm text-muted-foreground">
              Organization-wide operational health across all workspaces.
            </p>
          </div>

          <DashboardCharts orgId={org.id} orgSlug={orgSlug} workspaces={workspaces ?? []} />

          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <Link key={s.label} href={s.href as never}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                    <s.icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{s.value}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What&apos;s next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Phase 1 sets up authentication, organizations, and workspaces. The work-management,
                AI capture pipeline, and reporting modules plug into this foundation next.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/${orgSlug}/workspaces/new` as never}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create a workspace <ArrowUpRight className="size-3.5" />
                </Link>
                <Link
                  href={`/${orgSlug}/settings/members` as never}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  Invite your team <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
