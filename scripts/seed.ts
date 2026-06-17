/**
 * Seed demo data for local development.
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (the service role bypasses RLS — local/dev use only).
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function slugify(s: string): string {
  return (
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") +
    "-" +
    randomBytes(3).toString("hex").slice(0, 5)
  );
}

async function ensureUser(email: string, password: string, fullName: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error && !error.message.toLowerCase().includes("already")) throw error;
  if (data?.user) return data.user.id;

  // Already exists — look the user up.
  const { data: list } = await admin.auth.admin.listUsers();
  const found = list.users.find((u) => u.email === email);
  if (!found) throw new Error(`Could not resolve user ${email}`);
  return found.id;
}

async function main() {
  console.log("Seeding demo data…");

  const ownerId = await ensureUser("owner@demo.test", "Str0ngPass", "Demo Owner");
  const memberId = await ensureUser("member@demo.test", "Str0ngPass", "Demo Member");

  const slug = slugify("Demo Operations");
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: "Demo Operations", slug, created_by: ownerId })
    .select("id")
    .single();
  if (orgErr) throw orgErr;

  await admin.from("org_members").insert([
    { org_id: org.id, user_id: ownerId, role: "owner" },
    { org_id: org.id, user_id: memberId, role: "member" },
  ]);

  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .insert({ org_id: org.id, name: "General", created_by: ownerId })
    .select("id")
    .single();
  if (wsErr) throw wsErr;

  await admin.from("workspace_members").insert([
    { workspace_id: ws.id, org_id: org.id, user_id: ownerId, role: "admin" },
    { workspace_id: ws.id, org_id: org.id, user_id: memberId, role: "member" },
  ]);

  // Seed the configurable task workflow via the SECURITY DEFINER function.
  const { error: seedErr } = await admin.rpc("seed_default_task_statuses", {
    p_org_id: org.id,
    p_workspace_id: ws.id,
  });
  if (seedErr) throw seedErr;

  console.log(`✓ Org "Demo Operations" (${slug})`);
  console.log("  owner@demo.test / Str0ngPass");
  console.log("  member@demo.test / Str0ngPass");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
