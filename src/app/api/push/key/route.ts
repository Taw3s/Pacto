import { NextResponse } from "next/server";
import { vapidKeys } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The public VAPID key the browser needs to subscribe (the private one never leaves the server). */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "push not configured" }, { status: 501 });
  const { publicKey } = await vapidKeys(admin);
  return NextResponse.json({ publicKey });
}
