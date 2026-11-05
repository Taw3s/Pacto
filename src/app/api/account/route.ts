import { NextResponse } from "next/server";
import { trustedMutationOrigin } from "@/lib/request-origin";
import { removeGroupMedia, removeUserMedia } from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Deletes the signed-in account (LGPD; the stores require it in the app): leaves the group the
 * same way as "Sair do grupo" (the group's history stays), deletes the photos, then the user.
 */
export async function DELETE(request: Request) {
  if (!trustedMutationOrigin(request)) return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "disabled" }, { status: 501 });

  const { data: member } = await admin.from("members").select("group_id").eq("user_id", me).maybeSingle();
  if (member) {
    // LGPD art. 16: after deletion the group keeps the receipts, but not the person's name on them.
    // Nothing is done yet if this fails: answer an error instead of dropping the member with the name still on receipts.
    const { error: unnamed } = await admin.from("payments").update({ received_name: null }).eq("received_by", me);
    if (unnamed) return NextResponse.json({ error: unnamed.message }, { status: 500 });
    const { data: status, error } = await admin.rpc("_drop_member", { p_user: me, p_group: member.group_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // A photo left behind is queued (0021) and retried by the daily cron: go on and delete the account.
    await (status === "closed" ? removeGroupMedia(admin, member.group_id) : removeUserMedia(admin, member.group_id, me)).catch((e) =>
      console.error("media cleanup failed; queued for retry", e instanceof Error ? e.message : e),
    );
  }
  const { error } = await admin.auth.admin.deleteUser(me);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.auth.signOut();
  return NextResponse.json({ status: "deleted" });
}
