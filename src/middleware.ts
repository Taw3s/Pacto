import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets, PWA files, images and the error-report tunnel (/monitoring, see next.config.ts).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|offline.html|manifest.webmanifest|monitoring|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
