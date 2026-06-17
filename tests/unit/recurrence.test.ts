import { describe, it, expect } from "vitest";
import { parseRule, nextRecurrence, describeRule } from "@/lib/recurrence";

describe("parseRule", () => {
  it("parses FREQ and INTERVAL", () => {
    expect(parseRule("FREQ=WEEKLY;INTERVAL=2")).toEqual({ freq: "WEEKLY", interval: 2 });
  });
  it("defaults interval to 1", () => {
    expect(parseRule("FREQ=DAILY")).toEqual({ freq: "DAILY", interval: 1 });
  });
  it("returns null for invalid rules", () => {
    expect(parseRule("nonsense")).toBeNull();
    expect(parseRule("FREQ=HOURLY")).toBeNull();
  });
});

describe("nextRecurrence", () => {
  it("advances by the weekly interval", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const next = nextRecurrence("FREQ=WEEKLY;INTERVAL=2", from);
    expect(next?.toISOString().slice(0, 10)).toBe("2026-01-15");
  });
  it("advances daily", () => {
    const next = nextRecurrence("FREQ=DAILY", new Date("2026-01-31T00:00:00Z"));
    expect(next?.toISOString().slice(0, 10)).toBe("2026-02-01");
  });
  it("returns null for invalid rule", () => {
    expect(nextRecurrence("bad", new Date())).toBeNull();
  });
});

describe("describeRule", () => {
  it("describes singular and plural intervals", () => {
    expect(describeRule("FREQ=WEEKLY;INTERVAL=1")).toBe("Every week");
    expect(describeRule("FREQ=MONTHLY;INTERVAL=3")).toBe("Every 3 months");
  });
  it("returns null when empty", () => {
    expect(describeRule(null)).toBeNull();
    expect(describeRule("")).toBeNull();
  });
});
