import { describe, it, expect } from "vitest";
import { passwordSchema, signupSchema, loginSchema } from "@/lib/validations/auth";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { createWorkspaceSchema } from "@/lib/validations/workspace";

describe("password policy", () => {
  it("rejects weak passwords", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1").success).toBe(false);
    expect(passwordSchema.safeParse("NoNumbersHere").success).toBe(false);
  });
  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("Str0ngPass").success).toBe(true);
  });
});

describe("signup schema", () => {
  it("requires name, email, strong password", () => {
    expect(
      signupSchema.safeParse({ fullName: "Ada", email: "a@b.com", password: "Str0ngPass" }).success,
    ).toBe(true);
    expect(
      signupSchema.safeParse({ fullName: "", email: "a@b.com", password: "Str0ngPass" }).success,
    ).toBe(false);
  });
});

describe("login schema", () => {
  it("requires a valid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("org + workspace schemas", () => {
  it("validates org name length", () => {
    expect(createOrganizationSchema.safeParse({ name: "A", timezone: "UTC" }).success).toBe(false);
    expect(createOrganizationSchema.safeParse({ name: "Acme", timezone: "UTC" }).success).toBe(true);
  });
  it("requires a uuid orgId for workspace creation", () => {
    expect(createWorkspaceSchema.safeParse({ orgId: "x", name: "Ops" }).success).toBe(false);
    expect(
      createWorkspaceSchema.safeParse({
        orgId: "00000000-0000-0000-0000-000000000000",
        name: "Ops",
      }).success,
    ).toBe(true);
  });
});
