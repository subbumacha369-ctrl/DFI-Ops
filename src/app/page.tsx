import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Send the user to their most recent organization, or onboarding if none.
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, organizations(slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const slug = (membership?.organizations as { slug?: string } | null)?.slug;
  if (slug) redirect(`/${slug}/dashboard`);
  redirect("/create-organization");
}
