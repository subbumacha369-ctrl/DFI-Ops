import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isDemoMode } from "@/lib/demo/config";

export async function middleware(request: NextRequest) {
  // Local review mode: no Supabase session, no auth guard — every screen is open.
  if (isDemoMode()) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
