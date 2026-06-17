import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptInvite } from "@/components/organization/accept-invite";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Preserve the token across sign-in so the user lands back here.
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join organization</CardTitle>
          <CardDescription>
            You&apos;ve been invited to collaborate. Accept to join the team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcceptInvite token={token} />
          <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
            Not now
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
