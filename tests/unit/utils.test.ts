import { describe, it, expect } from "vitest";
import { initials, formatDate, cn } from "@/lib/utils";

describe("initials", () => {
  it("derives initials from a full name", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
  });
  it("falls back to the email local part", () => {
    expect(initials(null, "subbu@example.com")).toBe("S");
  });
});

describe("formatDate", () => {
  it("renders an em dash for empty input", () => {
    expect(formatDate(null)).toBe("—");
  });
  it("formats a real date", () => {
    expect(formatDate("2026-01-15T00:00:00Z")).toContain("2026");
  });
});

describe("cn", () => {
  it("merges and dedupes tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
