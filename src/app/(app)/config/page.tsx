import { GroupSettings } from "@/components/GroupSettings";
import { MembershipSettings } from "@/components/MembershipSettings";
import { PageHeader } from "@/components/PageHeader";
import { SettingsForm } from "@/components/SettingsForm";
import { nextMonday, spToday } from "@/lib/dates";
import { getMembers, requireMember, signUrls } from "@/lib/data";
import { isDebtItem } from "@/lib/debt-items";
import { dayOffOn, itemsOn } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, me, user } = await requireMember();
  const [{ data: changes }, { data: group }, { data: menuRows }, urls, members] = await Promise.all([
    supabase.from("day_off_changes").select("weekday, effective_from").eq("user_id", me.user_id),
    supabase.from("groups").select("name, invite_code, owner_id").maybeSingle<{ name: string; invite_code: string; owner_id: string | null }>(),
    supabase.from("debt_menus").select("effective_from, items").order("effective_from"),
    signUrls(supabase, [me.avatar_path]),
    getMembers(supabase),
  ]);
  // oldest first: the first one inherits the group when the owner leaves (same order as _drop_member)
  const others = members
    .filter((m) => m.user_id !== me.user_id)
    .sort((a, b) => a.joined_on.localeCompare(b.joined_on) || a.created_at.localeCompare(b.created_at))
    .map((m) => ({ id: m.user_id, name: m.display_name }));
  const today = spToday();
  const menus = ((menuRows ?? []) as { effective_from: string; items: string[] }[]).map((m) => ({ effective_from: m.effective_from, items: m.items.filter(isDebtItem) }));
  const next = menus.filter((m) => m.effective_from > today).at(-1);

  return (
    <>
      <PageHeader title="Configurações" subtitle={user.email} backFallback={`/historico/${me.user_id}`} />
      {group && (
        <GroupSettings
          groupName={group.name}
          inviteCode={group.invite_code}
          isOwner={group.owner_id === me.user_id}
          menuToday={itemsOn(menus, today)}
          menuNext={next ? { from: next.effective_from, items: next.items } : null}
        />
      )}
      <SettingsForm
        groupId={me.group_id}
        userId={me.user_id}
        name={me.display_name}
        avatarUrl={me.avatar_path ? urls.get(me.avatar_path) ?? null : null}
        dayOffToday={dayOffOn(changes ?? [], today)}
        nextWeek={nextMonday(today)}
        dayOffNextWeek={dayOffOn(changes ?? [], nextMonday(today))}
      />
      <MembershipSettings isOwner={group?.owner_id === me.user_id} groupName={group?.name ?? ""} others={others} />
    </>
  );
}
