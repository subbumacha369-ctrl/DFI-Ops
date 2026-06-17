import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

type Client = SupabaseClient<Database>;

/**
 * Append an entry to the activity feed. Best-effort: a logging failure never
 * blocks the originating action. RLS requires org membership to insert.
 */
export async function logActivity(
  client: Client,
  input: {
    orgId: string;
    workspaceId?: string | null;
    actorId?: string | null;
    verb: string;
    objectType: string;
    objectId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await client.from("activity_events").insert({
      org_id: input.orgId,
      workspace_id: input.workspaceId ?? null,
      actor_id: input.actorId ?? null,
      verb: input.verb,
      object_type: input.objectType,
      object_id: input.objectId,
      metadata: (input.metadata ?? {}) as Json,
    });
  } catch {
    // swallow — activity logging is non-critical
  }
}
