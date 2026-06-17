import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { sendEmail } from "./email";

type Client = SupabaseClient<Database>;
type NotificationType =
  | "task_assigned" | "task_updated" | "task_completed" | "comment_added"
  | "mention" | "deadline_approaching" | "task_overdue" | "invitation"
  | "capture_processed" | "report_ready" | "automation";

/**
 * Create an in-app notification row. Channels beyond in_app (email, and the
 * future-ready whatsapp/sms/voice) are dispatched by the notification worker
 * that reads these rows; this function is the single in-app entry point.
 */
export async function createNotification(
  client: Client,
  input: {
    orgId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    payload?: Record<string, unknown>;
    channel?: "in_app" | "email";
  },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await client.from("notifications").insert({
    org_id: input.orgId,
    user_id: input.userId,
    type: input.type,
    channel: input.channel ?? "in_app",
    title: input.title,
    body: input.body ?? null,
    payload: (input.payload ?? {}) as Json,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Create an in-app notification and, when an email address is supplied and the
 * channel is "email", also send a transactional email. Best-effort throughout.
 */
export async function notify(
  client: Client,
  input: {
    orgId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    url?: string;
    email?: string | null;
    alsoEmail?: boolean;
  },
): Promise<void> {
  await createNotification(client, {
    orgId: input.orgId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    payload: input.url ? { url: input.url } : {},
  });
  if (input.alsoEmail && input.email) {
    await sendEmail({
      to: input.email,
      subject: input.title,
      html: `<div style="font-family:system-ui,sans-serif">
        <p>${input.body ?? input.title}</p>
        ${input.url ? `<p><a href="${input.url}">Open in Operations OS</a></p>` : ""}
      </div>`,
    });
  }
}

export { sendEmail, invitationEmail } from "./email";
