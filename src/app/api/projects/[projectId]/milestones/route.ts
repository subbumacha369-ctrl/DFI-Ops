import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized, notFound } from "@/lib/api";
import { createMilestoneSchema } from "@/lib/validations/project";

type Ctx = { params: Promise<{ projectId: string }> };

/** GET /api/projects/:projectId/milestones */
export async function GET(_request: Request, { params }: Ctx) {
  const { projectId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const { data, error: qErr } = await supabase
    .from("milestones").select("*").eq("project_id", projectId).order("position", { ascending: true });
  if (qErr) return error(qErr.message, 500);
  return json({ milestones: data ?? [] });
}

/** POST /api/projects/:projectId/milestones */
export async function POST(request: Request, { params }: Ctx) {
  const { projectId } = await params;
  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createMilestoneSchema.safeParse(body);
  if (!parsed.success) return error("Invalid milestone", 422, parsed.error.flatten());

  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!project) return notFound("Project");

  const { count } = await supabase
    .from("milestones").select("id", { count: "exact", head: true }).eq("project_id", projectId);

  const { data, error: iErr } = await supabase
    .from("milestones")
    .insert({
      org_id: project.org_id, project_id: projectId, name: parsed.data.name,
      description: parsed.data.description ?? null, due_date: parsed.data.dueDate ?? null,
      position: count ?? 0, created_by: user.id,
    })
    .select("*").maybeSingle();
  if (iErr) return error(iErr.message, 403);
  return json({ milestone: data }, { status: 201 });
}
