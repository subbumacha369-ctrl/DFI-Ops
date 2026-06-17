import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { updateProfileSchema } from "@/lib/validations/member";
import type { Database } from "@/types/database.types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/** PATCH /api/profile — update the signed-in user's own profile. */
export async function PATCH(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return error("Invalid profile", 422, parsed.error.flatten());

  const patch: ProfileUpdate = {};
  if (parsed.data.fullName !== undefined) patch.full_name = parsed.data.fullName;
  if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone;
  if (parsed.data.avatarUrl !== undefined) patch.avatar_url = parsed.data.avatarUrl;
  if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone;
  if (Object.keys(patch).length === 0) return error("No fields to update", 422);

  const { data, error: uErr } = await supabase
    .from("profiles").update(patch).eq("id", user.id).select("*").maybeSingle();
  if (uErr) return error(uErr.message, 403);
  return json({ profile: data });
}
