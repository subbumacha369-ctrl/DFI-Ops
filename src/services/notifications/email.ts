/**
 * Transactional email via Resend's HTTP API. Best-effort: a failure here never
 * blocks the originating action (e.g. an invitation still records even if the
 * email bounces). Returns whether the send succeeded.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Operations OS <noreply@example.com>";
  if (!apiKey) {
    return { ok: false, error: "email_not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `resend_${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}

export function invitationEmail(params: {
  orgName: string;
  inviterName: string;
  acceptUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `You're invited to ${params.orgName} on Operations OS`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0f766e">Join ${escapeHtml(params.orgName)}</h2>
        <p>${escapeHtml(params.inviterName)} invited you to collaborate on Operations OS.</p>
        <p>
          <a href="${params.acceptUrl}"
             style="display:inline-block;background:#0f766e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
            Accept invitation
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">This link expires in 14 days.</p>
      </div>`,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
