/**
 * Minimal RFC-5545-style recurrence support. Parses a subset of RRULE
 * (FREQ=DAILY|WEEKLY|MONTHLY|YEARLY; INTERVAL=n) sufficient for repeating tasks,
 * and computes the next occurrence after a given anchor date.
 */
export type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export function parseRule(rule: string): { freq: Freq; interval: number } | null {
  const parts = Object.fromEntries(
    rule
      .replace(/^RRULE:/i, "")
      .split(";")
      .map((kv) => kv.split("=").map((s) => s.trim().toUpperCase())),
  );
  const freq = parts.FREQ as Freq | undefined;
  if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return null;
  const interval = Math.max(1, Number.parseInt(parts.INTERVAL ?? "1", 10) || 1);
  return { freq, interval };
}

export function nextRecurrence(rule: string, from: Date): Date | null {
  const parsed = parseRule(rule);
  if (!parsed) return null;
  const d = new Date(from);
  switch (parsed.freq) {
    case "DAILY": d.setDate(d.getDate() + parsed.interval); break;
    case "WEEKLY": d.setDate(d.getDate() + 7 * parsed.interval); break;
    case "MONTHLY": d.setMonth(d.getMonth() + parsed.interval); break;
    case "YEARLY": d.setFullYear(d.getFullYear() + parsed.interval); break;
  }
  return d;
}

/** Human label for a rule, e.g. "Every 2 weeks". */
export function describeRule(rule: string | null | undefined): string | null {
  if (!rule) return null;
  const parsed = parseRule(rule);
  if (!parsed) return null;
  const unit = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year" }[parsed.freq];
  return parsed.interval === 1 ? `Every ${unit}` : `Every ${parsed.interval} ${unit}s`;
}

export const RECURRENCE_PRESETS: { label: string; value: string }[] = [
  { label: "Does not repeat", value: "" },
  { label: "Daily", value: "FREQ=DAILY;INTERVAL=1" },
  { label: "Weekly", value: "FREQ=WEEKLY;INTERVAL=1" },
  { label: "Every 2 weeks", value: "FREQ=WEEKLY;INTERVAL=2" },
  { label: "Monthly", value: "FREQ=MONTHLY;INTERVAL=1" },
];
