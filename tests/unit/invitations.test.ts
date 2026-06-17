import { describe, it, expect } from "vitest";
import { effectiveInvitationStatus, isInvitationOpen } from "@/lib/invitations";

const HOUR = 60 * 60 * 1000;

describe("effectiveInvitationStatus", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("keeps a pending invite pending before expiry", () => {
    expect(effectiveInvitationStatus("pending", new Date(now + HOUR).toISOString(), now)).toBe("pending");
  });

  it("treats an expired-but-still-pending invite as expired", () => {
    expect(effectiveInvitationStatus("pending", new Date(now - HOUR).toISOString(), now)).toBe("expired");
  });

  it("never overrides a terminal status", () => {
    expect(effectiveInvitationStatus("accepted", new Date(now - HOUR).toISOString(), now)).toBe("accepted");
    expect(effectiveInvitationStatus("revoked", new Date(now - HOUR).toISOString(), now)).toBe("revoked");
  });
});

describe("isInvitationOpen", () => {
  it("is open for pending and expired only", () => {
    expect(isInvitationOpen("pending")).toBe(true);
    expect(isInvitationOpen("expired")).toBe(true);
    expect(isInvitationOpen("accepted")).toBe(false);
    expect(isInvitationOpen("revoked")).toBe(false);
  });
});
