import { Check, Circle, Pause, Settings, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonthNav, monthName } from "@/components/MonthNav";
import { PageHeader } from "@/components/PageHeader";
import { CollectionShelf } from "@/components/CollectionShelf";
import { MilestonePlaque } from "@/components/MilestonePlaque";
import { PersonPicker } from "@/components/PersonPicker";
import { Sprite } from "@/components/Sprite";
import { collectible, COLLECTION_EXPANSION_NOTE_UNTIL } from "@/lib/collectibles";
import { eachDay, lastDayOfMonth, monthKey, spToday, weekdayOf } from "@/lib/dates";
import { getLedgerInputs, getMembers, requireMember } from "@/lib/data";
import { currentStreak, dayStatus, streakMilestone, type DayStatus } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEK_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WORD: Record<DayStatus, string> = { done: "cumprido", missed: "falhou", off: "folga", pending: "pendente (hoje)", before: "sem meta" };

function Cell({ day, status, today, offButDone }: { day: string; status: DayStatus; today: boolean; offButDone: boolean }) {
  const n = Number(day.slice(8));
  const style: Record<DayStatus, string> = {
    done: "bg-done-bg text-done",
    missed: "bg-fail-bg text-fail",
    off: "bg-off-bg text-off",
    pending: "bg-pending-bg text-pending",
    before: "text-muted",
  };
  const Icon = status === "done" ? Check : status === "missed" ? X : status === "off" ? Pause : status === "pending" ? Circle : null;
  const label = `${n} de ${monthName(day.slice(0, 7)).split(" ")[0].toLowerCase()}, ${WEEK_FULL[weekdayOf(day)]}: ${WORD[status]}${offButDone ? ", metas feitas na folga" : ""}${today ? ", hoje" : ""}`;
  return (
    <li
      aria-label={label}
      data-day={day}
      data-status={status}
      className={`relative flex h-12 flex-col items-center justify-center rounded-sm ${style[status]} ${today ? "ring-2 ring-accent ring-inset" : ""}`}
    >
      <span className="pixel tabular text-lg leading-5">{n}</span>
      {Icon && <Icon size={14} strokeWidth={2.5} aria-hidden />}
      {offButDone && <Check size={10} strokeWidth={3} aria-hidden className="absolute right-1 top-1 text-done" />}
    </li>
  );
}

export default async function HistoryPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ m?: string }> }) {
  const [{ userId }, { m }] = await Promise.all([params, searchParams]);
  const { supabase, me } = await requireMember();
  const today = spToday();
  const members = await getMembers(supabase);
  const member = members.find((x) => x.user_id === userId);
  if (!member) notFound();

  const [{ inputs }, { data: chestRows, error: chestError }] = await Promise.all([
    getLedgerInputs(supabase, [member]),
    supabase.from("chest_openings").select("item_id").eq("user_id", userId),
  ]);
  // A failed read shows an error with a retry, never an empty shelf ("0/18" would look like a loss).
  const counts: Record<string, number> | null = chestError ? null : {};
  for (const r of chestRows ?? []) if (counts) counts[r.item_id] = (counts[r.item_id] ?? 0) + 1;
  const unknownIds = Object.keys(counts ?? {}).filter((id) => !collectible(id));
  if (unknownIds.length) console.warn("collection: unknown collectible ids", unknownIds);
  const input = inputs.get(userId)!;
  const current = monthKey(today);
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : current;
  const first = `${month}-01`;
  const days = eachDay(first, lastDayOfMonth(first));
  const statuses = days.map((d) => dayStatus(input, d, today));
  const count = (s: DayStatus) => statuses.filter((x) => x === s).length;
  const isMe = userId === me.user_id;
  const streak = currentStreak(input, today);
  const monthLower = monthName(month).split(" ")[0].toLowerCase();
  const milestone = streakMilestone(streak);

  return (
    <>
      <PageHeader
        title={isMe ? "Perfil" : "Histórico"}
        right={
          <Link href="/config" className="btn-secondary min-h-12 px-3 text-sm">
            <Settings size={18} aria-hidden />
            Configurações
          </Link>
        }
      />
      <PersonPicker people={members.map((x) => ({ id: x.user_id, name: x.display_name }))} selected={userId} month={month} />

      {/* "Arquivo do membro" (Astra brief of 03/11/2026, block 2): the box, the label and the order carry the idea; no paper or tabs. */}
      <div className="card mb-6 flex items-center gap-3">
        <Sprite name="archiveBox" />
        <div className="min-w-0">
          <p className="text-xs leading-4 text-muted">Arquivo do membro</p>
          <h2 className="pixel break-words text-2xl font-bold uppercase leading-7 hyphens-auto">{member.display_name}</h2>
        </div>
      </div>

      {milestone && <MilestonePlaque milestone={milestone} viewerId={me.user_id} personId={userId} />}

      <dl className="card mb-6 grid grid-cols-2 gap-3 !p-4">
        <div className="min-w-0">
          <dt className="text-sm leading-5 text-muted">Sequência atual</dt>
          <dd className="tabular text-[28px] font-bold leading-8" data-testid="streak">
            {streak}
          </dd>
          <dd className="break-words text-sm leading-5 text-muted">{streak === 1 ? "dia seguido" : "dias seguidos"}, folgas não interrompem</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm leading-5 text-muted">Falhas no mês</dt>
          <dd className="tabular text-[28px] font-bold leading-8" data-testid="missed-month">
            {count("missed")}
          </dd>
          <dd className="break-words text-sm leading-5 text-muted">
            {count("missed") === 1 ? "dia descumprido" : "dias descumpridos"} em {monthLower}
          </dd>
        </div>
      </dl>

      <div className="mb-6 [&>section]:mb-0">
        <CollectionShelf counts={counts} isMe={isMe} failed={!!chestError} expansionNote={today <= COLLECTION_EXPANSION_NOTE_UNTIL} />
      </div>

      <h2 className="pixel mb-2 text-xl uppercase leading-6">Histórico do mês</h2>
      <MonthNav month={month} current={current} hrefFor={(x) => `/historico/${userId}?m=${x}`} />

      <section aria-label={`Calendário de ${monthLower}`}>
        {count("done") + count("missed") + count("off") === 0 && <p className="mb-3 text-sm leading-5 text-muted">Ainda não há registros neste mês.</p>}
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-semibold text-muted" aria-hidden>
          {WEEK.map((d, i) => (
            <span key={i} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <ol className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: weekdayOf(first) }, (_, i) => (
            <li key={`pad-${i}`} aria-hidden />
          ))}
          {days.map((d, i) => (
            <Cell key={d} day={d} status={statuses[i]} today={d === today} offButDone={statuses[i] === "off" && input.completedDays.has(d)} />
          ))}
        </ol>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <Check size={16} aria-hidden className="text-done" /> Cumprido: {count("done")}
          </li>
          <li className="flex items-center gap-2">
            <X size={16} aria-hidden className="text-fail" /> Falhou: {count("missed")}
          </li>
          <li className="flex items-center gap-2">
            <Pause size={16} aria-hidden className="text-off" /> Folga: {count("off")}
          </li>
          <li className="flex items-center gap-2">
            <Circle size={16} aria-hidden className="text-pending" /> Hoje, pendente
          </li>
        </ul>
      </section>
    </>
  );
}
