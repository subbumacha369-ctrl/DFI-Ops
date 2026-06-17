import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { addProjectMemberSchema } from "@/lib/validations/project";
import { notify } from "@/services/notifications";

type Ctx = { params: Promise<{ projectId: string }> };

/** GET /api/projects/:projectId/members */
export async function GET(_request: Request, { params }: Ctx) {
  const { projectId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data: members, error: qErr } = await supabase
    .from("project_members").select("*").eq("project_id", projectId);
  if (qErr) return error(qErr.message, 500);

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return json({ members: (members ?? []).map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null })) });
}

/** POST /api/projects/:projectId/members — assign a team member. */
export async function POST(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = addProjectMemberSchema.safeParse(body);
  if (!parsed.success) return error("Invalid member", 422);

  const { data: project } = await supabase
    .from("projects").select("org_id, workspace_id, name").eq("id", projectId).maybeSingle();
  if (!project) return notFound("Project");

  const { data, error: iErr } = await supabase
    .from("project_members")
    .insert({ org_id: project.org_id, project_id: projectId, user_id: parsed.data.userId, role: parsed.data.role })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);

  if (parsed.data.userId !== user.id) {
    await notify(supabase, {
      orgId: project.org_id, userId: parsed.data.userId, type: "task_assigned",
      title: `Added to project: ${project.name}`,
      url: `/w/${project.workspace_id}/projects/${projectId}`,
    });
  }
  return json({ member: data }, { status: 201 });
}

/** DELETE /api/projects/:projectId/members?userId=… */
export async function DELETE(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return error("userId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { error: dErr } = await supabase
    .from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  if (dErr) return error(dErr.message, 403);
  return json({ ok: true });
}
