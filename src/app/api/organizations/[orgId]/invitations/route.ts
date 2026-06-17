import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized } from "@/lib/api";
import { inviteMemberSchema } from "@/lib/validations/organization";
import { sendEmail, invitationEmail } from "@/services/notifications";

type Ctx = { params: Promise<{ orgId: string }> };

function siteUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  );
}

function acceptUrlFor(request: Request, token: string): string {
  return `${siteUrl(request)}/accept-invite?token=${token}`;
}

/** GET /api/organizations/:orgId/invitations — all invitations + status (admins). */
export async function GET(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("org_invitations")
    .select("id, email, role, status, token, expires_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (qErr) return error(qErr.message, 500);

  const now = Date.now();
  const invitations = (data ?? []).map((inv) => {
    // A still-"pending" invite past its expiry is effectively expired.
    const status =
      inv.status === "pending" && new Date(inv.expires_at).getTime() < now
        ? "expired"
        : inv.status;
    const canResend = status === "pending" || status === "expired";
    return {
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      // Admins can copy/share the link directly as an email fallback.
      acceptUrl: canResend ? acceptUrlFor(request, inv.token) : null,
    };
  });

  return json({ invitations });
}

/** POST /api/organizations/:orgId/invitations — invite a member + email them. */
export async function POST(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) return error("Invalid invitation", 422, parsed.error.flatten());

  // Insert is allowed only for org admins (enforced by RLS).
  const { data: invite, error: iErr } = await supabase
    .from("org_invitations")
    .insert({
      org_id: orgId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select("id, email, role, token, status, expires_at")
    .maybeSingle();

  if (iErr) return error(iErr.message, 403);
  if (!invite) return error("Could not create invitation", 403);

  // Best-effort email — the invitation already exists regardless of delivery.
  const [{ data: org }, { data: inviter }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
  ]);

  const acceptUrl = acceptUrlFor(request, invite.token);
  const mail = invitationEmail({
    orgName: org?.name ?? "your team",
    inviterName: inviter?.full_name ?? inviter?.email ?? "A teammate",
    role: invite.role,
    acceptUrl,
  });
  const emailResult = await sendEmail({ to: invite.email, ...mail });

  return json(
    {
      invitation: { id: invite.id, email: invite.email, role: invite.role, status: invite.status },
      // Returned so the admin can copy/share the link if email delivery is off.
      acceptUrl,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? undefined : emailResult.error,
    },
    { status: 201 },
  );
}

/** DELETE /api/organizations/:orgId/invitations?id=… — revoke a pending invite. */
export async function DELETE(request: Request, { params }: Ctx) {
  const { orgId } = await params;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return error("id is required", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { error: uErr } = await supabase
    .from("org_invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("org_id", orgId);

  if (uErr) return error(uErr.message, 403);
  return json({ ok: true });
}
