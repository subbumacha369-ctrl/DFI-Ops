import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  timezone: z.string().min(1).default("UTC"),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().min(1).optional(),
  locale: z.string().min(2).max(10).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member", "guest"]).default("member"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member", "guest"]),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
