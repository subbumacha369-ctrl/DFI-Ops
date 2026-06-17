import { getAuth } from "@/lib/auth-route";
import { json, error, unauthorized } from "@/lib/api";
import { computeOrgMetrics, type MetricsFilters } from "@/services/metrics";

/** GET /api/metrics?orgId=…&workspaceId=&days=&projectId=&assignedTo=&departmentId=&teamId=&from=&to= */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId) return error("orgId is required", 400);

  const { supabase, user } = await getAuth();
  if (!user) return unauthorized();

  const p = url.searchParams;
  const filters: MetricsFilters = {
    workspaceId: p.get("workspaceId") ?? undefined,
    days: Number.parseInt(p.get("days") ?? "14", 10) || 14,
    projectId: p.get("projectId") ?? undefined,
    assignedTo: p.get("assignedTo") ?? undefined,
    departmentId: p.get("departmentId") ?? undefined,
    teamId: p.get("teamId") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
  };

  const metrics = await computeOrgMetrics(supabase, orgId, filters);
  return json({ metrics });
}
