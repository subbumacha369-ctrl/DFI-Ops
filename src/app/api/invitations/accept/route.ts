import { createClient } from "@/lib/supabase/server";
import { json, error, unauthorized } from "@/lib/api";
import { acceptInvitationSchema } from "@/lib/validations/organization";

/** POST /api/invitations/accept — accept an invite token for the signed-in user. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = acceptInvitationSchema.safeParse(body);
  if (!parsed.success) return error("Invalid token", 422);

  const { data, error: rpcError } = await supabase
    .rpc("accept_invitation", { p_token: parsed.data.token })
    .single();

  if (rpcError || !data) {
    return error(rpcError?.message ?? "Could not accept invitation", 400);
  }
  return json({ orgId: data.org_id, slug: data.org_slug });
}
