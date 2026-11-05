import { NextResponse } from "next/server";
import { trustedMutationOrigin } from "@/lib/request-origin";
import { removeGroupMedia, removeUserMedia } from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * { action: "leave" } — the signed-in member leaves the group.
 * { action: "remove", userId } — the owner removes a member.
 * The database checks who may do what; the photos of whoever left are deleted afterwards.
 */
export async function POST(req: Request) {
  if (!trustedMutationOrigin(req)) return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { data: member } = await supabase.from("members").select("group_id").eq("user_id", me).maybeSingle();
  if (!member) return NextResponse.json({ error: "not a member" }, { status: 403 });

  let who = me;
  if (body.action === "remove" && typeof body.userId === "string") {
    who = body.userId;
  } else if (body.action !== "leave") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const rpc = await supabase.rpc("change_membership", { p_group: member.group_id, p_action: body.action, p_user: who });
  if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 403 });

  const admin = createAdminClient();
  if (admin) {
    // The change is done; a photo left behind is queued (0021) and retried by the daily cron, so it does not fail the answer.
    await (rpc.data === "closed" ? removeGroupMedia(admin, member.group_id) : removeUserMedia(admin, member.group_id, who)).catch((e) =>
      console.error("media cleanup failed; queued for retry", e instanceof Error ? e.message : e),
    );
  }
  // Removing someone rotates the invite code (0026): hand back the new one, read through the owner's own session.
  if (body.action === "remove" && rpc.data === "left") {
    const { data: group } = await supabase.from("groups").select("invite_code").eq("id", member.group_id).maybeSingle();
    return NextResponse.json({ status: rpc.data, inviteCode: group?.invite_code ?? null });
  }
  return NextResponse.json({ status: rpc.data });
}
