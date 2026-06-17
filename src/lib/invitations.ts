export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

/**
 * The displayed status of an invitation. A row still marked "pending" in the DB
 * but past its expiry is effectively "expired" (the DB flips it lazily on the
 * next accept attempt). Pure + deterministic so it can drive both API and UI.
 */
export function effectiveInvitationStatus(
  status: string,
  expiresAt: string,
  now: number = Date.now(),
): InvitationStatus {
  if (status === "pending" && new Date(expiresAt).getTime() < now) return "expired";
  return status as InvitationStatus;
}

/** Whether an invitation can still be resent / copied (open for action). */
export function isInvitationOpen(status: InvitationStatus): boolean {
  return status === "pending" || status === "expired";
}
