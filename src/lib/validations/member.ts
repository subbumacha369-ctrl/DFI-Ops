import { z } from "zod";

export const appRole = z.enum(["super_admin", "org_admin", "manager", "team_lead", "employee", "viewer"]);
export const memberStatus = z.enum(["active", "suspended", "invited"]);

/** Org admins / managers updating a member's employee + RBAC attributes. */
export const updateMemberSchema = z.object({
  appRole: appRole.optional(),
  role: z.enum(["owner", "admin", "member", "guest"]).optional(),
  status: memberStatus.optional(),
  employeeId: z.string().trim().max(40).nullable().optional(),
  designation: z.string().trim().max(120).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  reportingOfficerId: z.string().uuid().nullable().optional(),
  joinDate: z.string().nullable().optional(),
});

/** Self profile edit. */
export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  avatarUrl: z.string().trim().max(500).nullable().optional(),
  timezone: z.string().trim().max(60).optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  parentId: z.string().uuid().nullable().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  departmentId: z.string().uuid().nullable().optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
