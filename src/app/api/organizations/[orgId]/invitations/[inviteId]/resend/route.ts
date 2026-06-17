import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { sendEmail, invitationEmail } from "@/services/notifications";
import type { Database } from "@/types/database.types";

type Ctx = { params: Promise<{ orgId: string; inviteId: string }> };
type InvitationUpdate = Database["public"]["Tables"]["org_invitations"]["Update"];

function siteUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
}

/**
 * POST /api/organizations/:orgId/invitations/:inviteId/resend
 * Re-arms a pending/expired invitation (fresh 14-day expiry, status pending)
 * and re-sends the email. The token is preserved so any earlier link still works.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { orgId, inviteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Update is gated to org admins by RLS. Re-arm and read back the token.
  const patch: InvitationUpdate = {
    status: "pending",
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const { data: invite, error: uErr } = await supabase
    .from("org_invitations")
    .update(patch)
    .eq("id", inviteId)
    .eq("org_id", orgId)
    .in("status", ["pending", "expired"])
    .select("id, email, role, token, status")
    .maybeSingle();

  if (uErr) return error(uErr.message, 403);
  if (!invite) return notFound("Pending invitation");

  const [{ data: org }, { data: inviter }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
  ]);

  const acceptUrl = `${siteUrl(request)}/accept-invite?token=${invite.token}`;
  const mail = invitationEmail({
    orgName: org?.name ?? "your team",
    inviterName: inviter?.full_name ?? inviter?.email ?? "A teammate",
    role: invite.role,
    acceptUrl,
  });
  const emailResult = await sendEmail({ to: invite.email, ...mail });

  return json({
    invitation: { id: invite.id, email: invite.email, role: invite.role, status: invite.status },
    acceptUrl,
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
  });
}
