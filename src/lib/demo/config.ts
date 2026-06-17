/**
 * Local review ("demo") mode. When enabled, the app runs entirely on an
 * in-memory mock — no Supabase, Anthropic, Resend, or Upstash calls are made.
 * Toggle with NEXT_PUBLIC_DEMO_MODE=1 (set in .env.local for review).
 *
 * SAFETY: demo mode bypasses authentication, so it is hard-disabled in any
 * production build (NODE_ENV === "production", i.e. `next build`/`next start`
 * and all Vercel deployments). This guarantees the auth bypass can never ship
 * to production even if the env flag is misconfigured. Local review uses
 * `next dev` (development), where the flag still works.
 */
export function isDemoMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const v = process.env.NEXT_PUBLIC_DEMO_MODE;
  return v === "1" || v === "true";
}

/** The signed-in identity used throughout demo mode. */
export const DEMO_USER = {
  id: "u_demo",
  email: "demo@opsos.local",
  fullName: "Demo Manager",
};

export const DEMO_ORG_SLUG = "demo-co";
