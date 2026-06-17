import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { isDemoMode } from "@/lib/demo/config";
import { createMockClient } from "@/lib/demo/mock-client";

/**
 * Browser-side Supabase client. Safe to import in Client Components.
 * Uses the public anon key; all access is constrained by RLS.
 * In local review mode this returns an in-memory mock instead.
 */
export function createClient() {
  if (isDemoMode()) return createMockClient();

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
