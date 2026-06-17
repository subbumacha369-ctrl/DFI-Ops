import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized } from "@/lib/api";
import { inviteMemberSchema } from "@/lib/validations/organization";
import { sendEmail, invitationEmail } from "@/services/notifications";
import { effectiveInvitationStatus, isInvitationOpen } from "@/lib/invitations";

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
    const status = effectiveInvitationStatus(inv.status, inv.expires_at, now);
    return {
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      // Admins can copy/share the link directly as an email fallback.
      acceptUrl: isInvitationOpen(status) ? acceptUrlFor(request, inv.token) : null,
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
  const emailLc = parsed.data.email.toLowerCase();

  // Case 3: already a member of THIS org → friendly message, no error.
  // Profiles RLS lets an admin read co-members, so this resolves precisely; a
  // user who only belongs to another org isn't readable here, so cross-org
  // invites are still allowed (multi-tenant).
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", emailLc)
    .maybeSingle();
  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    if (existingMember) {
      return error("This user is already a member of this organization.", 409);
    }
  }

  // Case 2: a pending invite already exists → friendly message + the existing
  // link rather than letting the unique index throw a raw duplicate-key error.
  const { data: dup } = await supabase
    .from("org_invitations")
    .select("id, token")
    .eq("org_id", orgId)
    .eq("email", emailLc)
    .eq("status", "pending")
    .maybeSingle();
  if (dup) {
    return json(
      {
        error: "This user already has a pending invitation.",
        code: "duplicate_pending",
        invitation: { id: dup.id, email: emailLc, acceptUrl: acceptUrlFor(request, dup.token) },
      },
      { status: 409 },
    );
  }

  // Insert is allowed only for org admins (enforced by RLS).
  const { data: invite, error: iErr } = await supabase
    .from("org_invitations")
    .insert({
      org_id: orgId,
      email: emailLc,
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select("id, email, role, token, status, expires_at")
    .maybeSingle();

  // 23505 = unique_violation (race against the one-pending-per-email index).
  if (iErr) {
    if ((iErr as { code?: string }).code === "23505") {
      return error("This user already has a pending invitation.", 409);
    }
    return error(iErr.message, 403);
  }
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
