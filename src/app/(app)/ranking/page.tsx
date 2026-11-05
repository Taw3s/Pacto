import { Avatar } from "@/components/Avatar";
import { GroupTabs } from "@/components/GroupTabs";
import { MonthNav } from "@/components/MonthNav";
import { PageHeader } from "@/components/PageHeader";
import { Podium } from "@/components/Podium";
import { lastDayOfMonth, monthKey, spToday } from "@/lib/dates";
import { typingLabel } from "@/lib/typing";
import { getMembers, getMonthScores, requireMember, signUrls } from "@/lib/data";
import { podium, SCORING } from "@/lib/ranking";

export const dynamic = "force-dynamic";

const PODIUM = ["text-gold", "text-silver", "text-bronze"];

function hours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { supabase, me } = await requireMember();
  const current = monthKey(spToday());
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : current;
  const [{ members, scores, pos }, { data: typingRows }] = await Promise.all([
    getMonthScores(supabase, getMembers(supabase), month),
    supabase
      .from("typing_tests")
      .select("user_id, device, mode, lang, minutes, wpm, accuracy")
      .gte("day", `${month}-01`)
      .lte("day", lastDayOfMonth(`${month}-01`))
      .not("wpm", "is", null),
  ]);
  // Best wpm of the month per person: phones and computers apart, and apart per mode, language and length.
  const KINDS = ([1, 5] as const).flatMap((minutes) =>
    (
      [
        ["words", "pt", "Palavras"],
        ["text", "pt", "Texto"],
        ["words", "en", "Palavras · inglês"],
        ["text", "en", "Texto · inglês"],
      ] as const
    ).map(([mode, lang, label]) => [mode, lang, minutes, minutes === 5 ? `${label} · 5 min` : label] as const),
  );
  const records = (device: "pc" | "mobile", mode: "words" | "text", lang: "pt" | "en", minutes: 1 | 5) => {
    const best = new Map<string, { wpm: number; accuracy: number }>();
    for (const t of (typingRows ?? []) as {
      user_id: string;
      device: string;
      mode: string;
      lang: string;
      minutes: number;
      wpm: number;
      accuracy: number;
    }[]) {
      if (t.device !== device || t.mode !== mode || t.lang !== lang || Number(t.minutes) !== minutes) continue;
      const cur = best.get(t.user_id);
      if (!cur || Number(t.wpm) > cur.wpm)
        best.set(t.user_id, {
          wpm: Number(t.wpm),
          accuracy: Number(t.accuracy),
        });
    }
    return [...best.entries()].sort((a, b) => b[1].wpm - a[1].wpm).slice(0, 5);
  };
  const byId = new Map(members.map((x) => [x.user_id, x]));
  const urls = await signUrls(
    supabase,
    members.map((x) => x.avatar_path),
  );
  // Everyone at the top of each highlight, ties included.
  const leaders = (key: "studyMinutes" | "pages" | "projects") => {
    const top = Math.max(0, ...scores.map((s) => s[key]));
    return top > 0 ? scores.filter((s) => s[key] === top) : [];
  };
  const highlights = [
    {
      label: "Mais horas",
      s: leaders("studyMinutes"),
      value: (s: (typeof scores)[number]) => hours(s.studyMinutes),
    },
    {
      label: "Mais páginas",
      s: leaders("pages"),
      value: (s: (typeof scores)[number]) => `${s.pages} páginas`,
    },
    {
      label: "Mais projetos",
      s: leaders("projects"),
      value: (s: (typeof scores)[number]) => `${s.projects}`,
    },
  ];

  const everyoneZero = scores.every((s) => s.points === 0);
  const people = new Map(
    members.map((x) => [
      x.user_id,
      {
        name: x.display_name,
        url: x.avatar_path ? (urls.get(x.avatar_path) ?? null) : null,
      },
    ]),
  );
  const showcase = podium(scores);

  return (
    <div data-wide>
      <PageHeader title="Grupo" subtitle="Ranking do mês" />
      <GroupTabs />
      <MonthNav month={month} current={current} hrefFor={(x) => `/ranking?m=${x}`} />

      {/* Phones: one column. Desktop: showcase, highlights, records and rules on the left; the full standings on the right. */}
      <div className="grid gap-6 desk:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] desk:items-start">
        <Podium podium={showcase} people={people} />
        {!everyoneZero && (
          <section aria-labelledby="destaques" className="min-w-0">
            <h2 id="destaques" className="pixel mb-2 text-lg uppercase">
              Destaques do mês
            </h2>
            <div className="grid gap-2 min-[420px]:grid-cols-3 desk:grid-cols-1">
              {highlights.map((h) => (
                <div key={h.label} className="card !p-3">
                  <p className="text-sm text-muted">{h.label}</p>
                  <p className="tabular text-sm font-semibold">
                    {h.s.length ? `${h.s.map((x) => byId.get(x.userId)?.display_name).join(", ")} · ${h.value(h.s[0])}` : "Ninguém ainda"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="min-w-0 desk:col-start-2 desk:row-span-4 desk:row-start-1" aria-labelledby="classificacao">
          <h2 id="classificacao" className="pixel mb-2 text-lg uppercase">
            Classificação completa
          </h2>
          {everyoneZero && <p className="mb-2 text-sm text-muted">O ranking começa com as primeiras atividades. Cumpra as metas para começar a pontuar.</p>}
          <ol className="space-y-2" data-testid="ranking">
            {scores.map((s, i) => {
              const member = byId.get(s.userId)!;
              const p = pos[i];
              const podiumClass = p <= 3 && s.points > 0 ? PODIUM[p - 1] : null;
              const isMe = s.userId === me.user_id;
              return (
                <li
                  key={s.userId}
                  data-member={member.display_name}
                  data-position={p}
                  className={`card flex min-h-16 items-center gap-3 !p-3 ${isMe ? "!border-accent" : ""}`}
                >
                  <span className={`pixel tabular w-9 shrink-0 text-center text-xl font-bold ${podiumClass ?? "text-muted"}`}>{p}º</span>
                  <Avatar name={member.display_name} url={member.avatar_path ? urls.get(member.avatar_path) : null} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      <span className="break-words">{member.display_name}</span>
                      {isMe && <span className="ml-1.5 rounded-sm bg-accent px-1 text-xs font-bold uppercase text-on-accent">Você</span>}
                    </p>
                    <p className="tabular text-sm text-muted">
                      {hours(s.studyMinutes)} de estudo · {s.pages} {s.pages === 1 ? "página" : "páginas"}
                      {s.projects > 0 && ` · ${s.projects} ${s.projects === 1 ? "projeto" : "projetos"}`} · {s.completedDays}{" "}
                      {s.completedDays === 1 ? "dia" : "dias"}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="pixel tabular block text-2xl font-bold leading-8" data-testid="points">
                      {s.points}
                    </span>
                    <span className="text-xs text-muted">pts</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="card min-w-0" aria-labelledby="recordes" data-testid="typing-records">
          <h2 id="recordes" className="pixel mb-3 text-xl uppercase leading-6">
            Recordes de digitação
          </h2>
          <div className="grid gap-4 min-[420px]:grid-cols-2">
            {(["pc", "mobile"] as const).map((device) => {
              const lists = KINDS.map(([mode, lang, minutes, label]) => ({
                mode,
                lang,
                minutes,
                label,
                list: records(device, mode, lang, minutes),
              })).filter((k) => k.list.length > 0);
              return (
                <div key={device} data-device={device}>
                  <h3 className="pixel mb-1 text-base uppercase text-muted">{device === "pc" ? "PC" : "Celular"}</h3>
                  {lists.length === 0 ? (
                    <p className="text-sm text-muted">Ninguém fez teste ainda.</p>
                  ) : (
                    lists.map(({ mode, lang, minutes, label, list }) => (
                      <div key={`${mode}-${lang}-${minutes}`} data-mode={mode} data-lang={lang} data-minutes={minutes} className="mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                        <ol className="space-y-1 text-sm">
                          {list.map(([id, r], n) => (
                            <li key={id} className="flex justify-between gap-2">
                              <span className="min-w-0 break-words">
                                {n + 1}. {byId.get(id)?.display_name ?? "?"}
                              </span>
                              <span className="tabular shrink-0 font-semibold">{typingLabel(r)}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <details className="card min-w-0 text-sm">
          <summary className="cursor-pointer py-3 font-semibold">Como a pontuação funciona</summary>
          <ul className="mt-3 space-y-1 text-muted">
            <li>Dia cumprido (3 metas): {SCORING.completedDay} pts</li>
            <li>
              Estudo: {SCORING.perStudyMinute} pt por minuto, até {SCORING.maxStudyMinutesPerDay} min por dia
            </li>
            <li>
              Leitura: {SCORING.perPage} pts por página, até {SCORING.maxPagesPerDay} páginas por dia
            </li>
            <li>Digitação: o melhor teste do dia vale WPM × precisão em pontos (60 WPM com 95% = 57), até {SCORING.maxTypingPointsPerDay} por dia</li>
            <li>Projeto: {SCORING.perProject} pts, 1 por dia</li>
            <li>Prova anulada pelo Tribunal não pontua. Provas enviadas na folga pontuam normalmente.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
