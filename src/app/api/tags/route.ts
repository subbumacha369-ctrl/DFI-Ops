import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";

/** GET /api/tags?orgId=… — org tag vocabulary. */
export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return error("orgId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("tags")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ tags: data ?? [] });
}

/** POST /api/tags — create an org tag. */
export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const orgId = body?.orgId as string | undefined;
  const name = (body?.name as string | undefined)?.trim();
  if (!orgId || !name) return error("orgId and name are required", 422);

  const { data, error: iErr } = await supabase
    .from("tags")
    .insert({ org_id: orgId, name, color: body?.color ?? "#64748b" })
    .select("*")
    .maybeSingle();

  if (iErr) return error(iErr.message, 403);
  return json({ tag: data }, { status: 201 });
}
