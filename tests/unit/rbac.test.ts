import { describe, it, expect } from "vitest";
import {
  can, assignableRoles, ROLE_PERMISSIONS, ROLE_ORDER,
  canModule, isFeatureVisible, moduleAccessSummary,
} from "@/lib/rbac";

describe("can()", () => {
  it("super_admin passes any permission", () => {
    expect(can("super_admin", "org.manage")).toBe(true);
    expect(can("super_admin", "tasks.manage_own")).toBe(true);
  });
  it("org_admin manages members but not the platform", () => {
    expect(can("org_admin", "members.manage")).toBe(true);
    expect(can("org_admin", "permissions.manage")).toBe(true);
    expect(can("org_admin", "org.manage")).toBe(false);
  });
  it("manager can assign tasks but not manage members directory", () => {
    expect(can("manager", "tasks.assign")).toBe(true);
    expect(can("manager", "team.manage")).toBe(true);
    expect(can("manager", "members.manage")).toBe(false);
  });
  it("employee manages only own work", () => {
    expect(can("employee", "tasks.manage_own")).toBe(true);
    expect(can("employee", "tasks.assign")).toBe(false);
    expect(can("employee", "projects.create")).toBe(false);
  });
  it("viewer is read-only", () => {
    expect(can("viewer", "read")).toBe(true);
    expect(can("viewer", "tasks.create")).toBe(false);
  });
  it("null role grants nothing", () => {
    expect(can(null, "read")).toBe(false);
  });
});

describe("assignableRoles()", () => {
  it("nobody can grant at/above their own level", () => {
    expect(assignableRoles("org_admin")).not.toContain("org_admin");
    expect(assignableRoles("org_admin")).not.toContain("super_admin");
    expect(assignableRoles("org_admin")).toContain("manager");
    expect(assignableRoles("manager")).toEqual(["team_lead", "employee", "viewer"]);
    expect(assignableRoles("employee")).toEqual([]);
  });
});

describe("matrix integrity", () => {
  it("every role has a defined permission set", () => {
    for (const r of ROLE_ORDER) expect(Array.isArray(ROLE_PERMISSIONS[r])).toBe(true);
  });
});

describe("canModule (dynamic matrix)", () => {
  it("uses code defaults when no override", () => {
    expect(canModule("employee", "tasks", "view")).toBe(true);
    expect(canModule("employee", "tasks", "delete")).toBe(false);
    expect(canModule("employee", "reports", "view")).toBe(false);
    expect(canModule("manager", "projects", "create")).toBe(true);
  });
  it("super_admin always allowed", () => {
    expect(canModule("super_admin", "settings", "delete")).toBe(true);
  });
  it("overrides win over defaults", () => {
    const ov = [{ app_role: "employee" as const, module: "reports", action: "view", allowed: true }];
    expect(canModule("employee", "reports", "view", ov)).toBe(true);
    const off = [{ app_role: "manager" as const, module: "projects", action: "create", allowed: false }];
    expect(canModule("manager", "projects", "create", off)).toBe(false);
  });
  it("summarizes access level", () => {
    expect(moduleAccessSummary("super_admin", "tasks")).toBe("Full");
    expect(moduleAccessSummary("viewer", "tasks")).toBe("View");
    expect(moduleAccessSummary("employee", "settings")).toBe("No");
  });
});

describe("feature visibility", () => {
  it("visible by default; override hides for a role", () => {
    expect(isFeatureVisible("employee", "nav.reports")).toBe(true);
    const ov = [{ app_role: "employee" as const, feature_key: "nav.reports", hidden: true }];
    expect(isFeatureVisible("employee", "nav.reports", ov)).toBe(false);
    expect(isFeatureVisible("manager", "nav.reports", ov)).toBe(true);
  });
});
