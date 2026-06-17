import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { isDemoMode } from "@/lib/demo/config";
import { createMockClient } from "@/lib/demo/mock-client";

/**
 * Server-side Supabase client bound to the request cookies.
 * Use in Server Components, Route Handlers, and Server Actions.
 * In local review mode this returns an in-memory mock instead.
 */
export async function createClient() {
  if (isDemoMode()) return createMockClient();

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore because
            // middleware refreshes the session on every request.
          }
        },
      },
    },
  );
}
