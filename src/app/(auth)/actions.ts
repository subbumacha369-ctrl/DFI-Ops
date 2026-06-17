"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, authRatelimit } from "@/lib/redis";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@/lib/validations/auth";

type ActionResult = { error?: string; message?: string };

/** Only allow same-origin relative paths as post-auth redirects (no open redirect). */
function safeNext(path?: string | null): string {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

async function origin(): Promise<string> {
  const h = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`
  );
}

export async function signInWithPassword(
  input: { email: string; password: string },
  next?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email and password" };

  const { success } = await checkLimit(authRatelimit, `login:${parsed.data.email}`);
  if (!success) return { error: "Too many attempts. Try again shortly." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Invalid email or password" };

  // Step up to MFA if the account has a verified factor.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    redirect("/mfa");
  }
  redirect(safeNext(next) as never);
}

export async function signUp(
  input: { fullName: string; email: string; password: string },
  next?: string,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const { success } = await checkLimit(authRatelimit, `signup:${parsed.data.email}`);
  if (!success) return { error: "Too many attempts. Try again shortly." };

  // After email confirmation, land the user where they were headed (e.g. an
  // invitation accept page) rather than the app root.
  const confirmUrl = `${await origin()}/auth/confirm?next=${encodeURIComponent(safeNext(next))}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: confirmUrl,
      data: { full_name: parsed.data.fullName },
    },
  });
  if (error) return { error: error.message };

  return {
    message:
      "Check your email to confirm your account, then sign in to continue.",
  };
}

export async function signInWithGoogle(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback` },
  });
  if (error) return { error: error.message };
  // External OAuth URL — outside the typed route map.
  if (data.url) redirect(data.url as never);
  return { error: "Could not start Google sign-in" };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(input: {
  email: string;
}): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email address" };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/confirm?next=/reset-password`,
  });
  // Always report success — never disclose whether an email is registered.
  return {
    message: "If that email is registered, a reset link is on its way.",
  };
}

export async function updatePassword(input: {
  password: string;
  confirm: string;
}): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };
  redirect("/");
}

/**
 * Change the password for a signed-in user. Re-verifies the current password
 * first (updateUser alone trusts the session), so a borrowed/forgotten session
 * cannot silently rotate credentials.
 */
export async function changePassword(input: {
  current: string;
  password: string;
  confirm: string;
}): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You must be signed in" };

  const { success } = await checkLimit(authRatelimit, `change-pw:${user.id}`);
  if (!success) return { error: "Too many attempts. Try again shortly." };

  // Verify the current password by re-authenticating.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (verifyError) return { error: "Current password is incorrect" };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  return { message: "Password updated." };
}
