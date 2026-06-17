import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { computeDrilldown, type MetricsFilters } from "@/services/metrics";

/** GET /api/metrics/drilldown?orgId=&bucket=task_overdue&…filters — underlying rows. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const bucket = url.searchParams.get("bucket");
  if (!orgId || !bucket) return error("orgId and bucket are required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const p = url.searchParams;
  const filters: MetricsFilters & { userId?: string } = {
    workspaceId: p.get("workspaceId") ?? undefined,
    projectId: p.get("projectId") ?? undefined,
    assignedTo: p.get("assignedTo") ?? undefined,
    departmentId: p.get("departmentId") ?? undefined,
    teamId: p.get("teamId") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    userId: p.get("userId") ?? undefined,
  };

  const result = await computeDrilldown(supabase, orgId, bucket, filters);
  return json(result);
}
