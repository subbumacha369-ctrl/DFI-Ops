import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

type Client = SupabaseClient<Database>;

/**
 * Append a tamper-evident audit record (permission / role / visibility / access
 * changes). Writes to the append-only audit_events log; best-effort.
 */
export async function logAudit(
  client: Client,
  input: {
    orgId: string;
    actorId?: string | null;
    action: string;                 // e.g. "permission.changed", "role.changed"
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  try {
    await client.from("audit_events").insert({
      org_id: input.orgId,
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      before: (input.before ?? null) as Json,
      after: (input.after ?? null) as Json,
    });
  } catch {
    // audit logging is non-blocking
  }
}
