/* eslint-disable @next/next/no-img-element -- signed URL of the proof */
import { Maximize2 } from "lucide-react";
import { Avatar } from "../Avatar";
import { GavelStamp } from "../GavelStamp";
import { JudgeBubble } from "../Judge";
import { PhotoViewer } from "../PhotoViewer";
import { Sprite } from "../Sprite";
import { CourtBench } from "./CourtBench";
import { CourtCrowd } from "./CourtCrowd";
import { JuryBench } from "./JuryBench";
import { VoteForm } from "./VoteForm";
import type { Verdict } from "@/lib/ai-review";
import type { DisputeResult, DisputeVote, Member } from "@/lib/types";

export interface Juror {
  member: Member;
  avatarUrl: string | null;
  vote: DisputeVote | null;
}

interface Props {
  disputeId: string;
  result: DisputeResult;
  groupName: string;
  defendant: Member;
  defendantAvatar: string | null;
  accuser: string; // a member's name, or "Juiz IA"
  accuserAvatar: string | null;
  byAi: boolean;
  jurors: Juror[];
  /** The proof on the evidence table. */
  proof: { goal: string; day: string; value: string | null; photos: string[]; ai: Verdict | null; photoAge: string | null };
  me: { id: string; isOwner: boolean; canVote: boolean; vote: DisputeVote | null; joinedLate: boolean };
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });


const AI_WORD: Record<Verdict, string> = { match: "confere", mismatch: "não confere", unclear: "inconclusiva" };

// Seats shown on the jury bench; bigger groups get a summary (everyone is listed in the Votos tab).
const BENCH_SEATS = 8;

/**
 * The courtroom: the judge at the bench under the group's crest, accusation and defence on each side
 * of the evidence table, the jury bench, the score and the verdict. Visual only: the rules live in the database.
 */
export function Courtroom({ disputeId, result, groupName, defendant, defendantAvatar, accuser, accuserAvatar, byAi, jurors, proof, me }: Props) {
  const open = result.status === "open";
  const upheld = result.status === "upheld";
  const line = open
    ? byAi
      ? "A foto não bateu com a meta. Quem decide é o júri."
      : "Acusação feita. Quem decide é o júri."
    : `O júri decidiu: prova ${upheld ? "anulada" : "mantida"}.`;
  const seated = jurors.slice(0, jurors.length > BENCH_SEATS ? BENCH_SEATS - 1 : BENCH_SEATS);
  const voted = jurors.filter((j) => j.vote).length;
  // One key per viewer and dispute (the stamp listens to impacts with it; a closed session no longer strikes).
  const verdictKey = `verdict:${me.id}:${disputeId}`;

  return (
    <section className="card relative overflow-hidden !p-0" data-testid="dispute" aria-labelledby="tribunal-title">
      {/* back wall: wood panels, banners, the group's crest and the judge at the bench */}
      <div className="relative bg-[repeating-linear-gradient(90deg,#4a2a12_0_2px,#5e3518_2px_22px,#55301a_22px_24px)] px-4 pt-3">
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="min-w-0 rounded-sm border-2 border-[#3d220e] bg-[#2b1a0c]/90 px-2 py-1 shadow-[2px_2px_0_var(--color-hard-shadow)]">
            <h1 id="tribunal-title" className="pixel text-2xl font-bold uppercase leading-7 text-accent">
              Tribunal
            </h1>
            <p className="break-words text-xs font-semibold text-muted">do grupo {groupName}</p>
          </div>
          <span
            className={`pixel shrink-0 rounded-sm border-2 px-2 text-base uppercase ${
              open ? "border-warn bg-warn-bg text-warn" : upheld ? "border-fail bg-fail-bg text-fail" : "border-done bg-done-bg text-done"
            }`}
          >
            {open ? "Em votação" : "Encerrado"}
          </span>
        </div>

        <Banner side="left" />
        <Banner side="right" />

        <div className="relative mx-auto mt-1 flex w-fit flex-col items-center">
          <Crest name={groupName} />
          {/* the judge stands behind the bench: his lower half is hidden by it */}
          {/* Open: the session opens with one strike, once per viewer and tribunal (the AI's accusations too).
              Closed: the final pose, still; the decision is told by the text below, never re-enacted. */}
          <CourtBench open={open} playKey={`session:${me.id}:${disputeId}`} />
        </div>
        {/* the crowd starts at the bench's top: its back rows flank the bench, whose centre, the judge's head and gavel stay clear */}
        <div className="relative z-10 -mt-[66px] desk:-mt-[75px]">
          <CourtCrowd cue={open ? `session:${me.id}:${disputeId}` : undefined} />
        </div>
        <div className="relative z-10 mx-auto mt-2 flex max-w-xs justify-center pb-3">
          <JudgeBubble tail="up">{line}</JudgeBubble>
        </div>
      </div>
      <div aria-hidden className="h-2 border-b-4 border-wood-dark bg-wood" />

      {/* floor: accusation | evidence table | defence */}
      <div className="bg-[repeating-conic-gradient(#2e3238_0_25%,#33373e_0_50%)] bg-[length:24px_24px] px-3 pb-4 pt-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Podium label="Acusação" tone="fail">
            {byAi ? <Sprite name="judge-present6" /> : <Avatar name={accuser} url={accuserAvatar} size={48} />}
            <p className="mt-1 w-full hyphens-auto break-words text-center text-sm font-semibold" data-testid="accuser">
              {accuser}
            </p>
          </Podium>

          <div className="flex flex-col items-center">
            {proof.photos.length ? (
              <PhotoViewer
                photos={proof.photos}
                alt={`Prova de ${proof.goal.toLowerCase()} de ${defendant.display_name}`}
                label={`Ampliar a foto da prova de ${proof.goal.toLowerCase()} de ${defendant.display_name}`}
                className="group relative block h-20 w-20 overflow-hidden rounded-sm border-2 border-bevel-dark bg-surface shadow-[3px_3px_0_var(--color-hard-shadow)] desk:h-28 desk:w-28"
              >
                <img src={proof.photos[0]} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 rounded-sm bg-bg/90 p-0.5 text-xs font-semibold">
                  {proof.photos.length > 1 && <span className="tabular">{proof.photos.length}</span>}
                  <Maximize2 size={14} aria-hidden />
                </span>
              </PhotoViewer>
            ) : (
              <div className="h-20 w-20 rounded-sm bg-surface" />
            )}
            {/* the evidence table */}
            <div aria-hidden className="mt-1 h-3 w-24 rounded-[1px] border-b-4 border-wood-dark bg-wood desk:w-32" />
            <p className="pixel mt-1 text-sm uppercase text-muted">Prova</p>
          </div>

          <Podium label="Defesa" tone="done">
            <div className={`rounded-full border-[3px] ${upheld ? "border-fail" : result.status === "rejected" ? "border-done" : "border-warn"}`}>
              <Avatar name={defendant.display_name} url={defendantAvatar} size={48} />
            </div>
            <p className="mt-1 w-full hyphens-auto break-words text-center text-sm font-semibold" data-testid="defendant">
              {defendant.display_name}
            </p>
          </Podium>
        </div>

        {/* case file */}
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 text-sm desk:grid-cols-4">
          <Fact label="Meta" value={proof.goal} />
          <Fact label="Dia" value={proof.day} />
          <Fact label="Informado" value={proof.value ?? "—"} />
          <Fact label="Juiz IA" value={proof.ai ? AI_WORD[proof.ai] : "sem análise"} />
        </dl>
        {proof.photoAge && <p className="mt-2 border-l-[3px] border-warn pl-2 text-sm">{proof.photoAge}</p>}
      </div>

      {/* score */}
      <div className="mx-4 mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 text-center">
        <div>
          <p className="pixel tabular text-3xl font-bold leading-8 text-fail" data-testid="guilty-count">
            {result.yes}
          </p>
          <p className="text-xs font-semibold text-muted">Anular · culpado</p>
        </div>
        <p className="pixel text-xl text-muted">×</p>
        <div>
          <p className="pixel tabular text-3xl font-bold leading-8 text-done" data-testid="innocent-count">
            {result.no}
          </p>
          <p className="text-xs font-semibold text-muted">Manter · inocente</p>
        </div>
      </div>
      <p className="tabular mx-4 mt-2 text-center text-sm text-muted">
        Decide quem chegar a {result.majority} dos {result.eligible} votos.
        {open && ` Se ninguém chegar lá até ${when(result.closes_at)}, vence quem tiver mais votos; empate mantém a prova.`}
      </p>

      {/* jury bench */}
      <div className="mt-4 px-4">
        <p className="pixel mb-2 text-center text-base uppercase text-muted">
          Júri <span className="tabular">· {voted}/{jurors.length} votaram</span>
        </p>
        <JuryBench
          seats={seated.map(({ member, avatarUrl, vote }) => ({ id: member.user_id, name: member.display_name, avatarUrl, upheld: vote ? vote.upheld : null, reason: vote?.reason ?? null }))}
          more={jurors.length - seated.length}
        />
        {/* the bench they sit on */}
        <div aria-hidden className="mt-3 h-3 rounded-[1px] border-b-4 border-wood-dark bg-wood shadow-[0_3px_0_var(--color-hard-shadow)]" />
      </div>

      {/* verdict or my vote */}
      <div className="p-4">
        {!open ? (
          <GavelStamp
            playKey={verdictKey}
            showJudge={false}
            tone={upheld ? "fail" : "done"}
            stamp={upheld ? "Condenado" : "Absolvido"}
            note={
              upheld
                ? `${result.yes} a ${result.no}. Prova anulada: esta prova não conta e a meta deixa de valer.`
                : `${result.no} a ${result.yes}. Prova mantida: a prova continua valendo.`
            }
            testId="verdict"
          />
        ) : me.vote ? (
          <p className="font-medium">
            Seu voto: <b className={me.vote.upheld ? "text-fail" : "text-done"}>{me.vote.upheld ? "anular a prova" : "manter a prova"}</b> (
            {me.vote.upheld ? "culpado" : "inocente"}).
          </p>
        ) : me.isOwner ? (
          <p className="text-sm text-muted">Você é o réu e não vota. Use a aba Provas para se defender.</p>
        ) : me.joinedLate ? (
          <p className="text-sm text-muted">Você entrou no grupo depois que este tribunal foi aberto e não vota.</p>
        ) : me.canVote ? (
          <VoteForm disputeId={disputeId} defendant={defendant.display_name} />
        ) : null}
      </div>
    </section>
  );
}

function Podium({ label, tone, children }: { label: string; tone: "fail" | "done"; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <p className={`pixel mb-1 text-sm uppercase ${tone === "fail" ? "text-fail" : "text-done"}`}>{label}</p>
      {children}
      {/* the stand */}
      <div aria-hidden className="mt-1 h-6 w-full max-w-24 rounded-t-[2px] border-2 border-b-0 border-[#3d220e] bg-[repeating-linear-gradient(90deg,#5e3518_0_6px,#55301a_6px_8px)]" />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="break-words font-semibold">{value}</dd>
    </div>
  );
}

/** The group's crest: a pixel shield with the group's initial (same for every group, only the letter changes). */
function Crest({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? "P").toUpperCase();
  return (
    <svg viewBox="0 0 16 18" width={48} height={54} className="sprite drop-shadow-[2px_2px_0_var(--color-hard-shadow)]" aria-hidden shapeRendering="crispEdges">
      <path d="M1 1h14v9l-2 3-2 2-3 2-3-2-2-2-2-3z" fill="#e3b23c" />
      <path d="M2 2h12v8l-2 3-2 1-2 2-2-2-2-1-2-3z" fill="#682f3c" />
      <path d="M2 2h12v1H2z" fill="#7d3a49" />
      <text x="8" y="11.5" textAnchor="middle" fontSize="8" fontFamily="var(--font-display)" fill="#e9dcc3">
        {initial}
      </text>
    </svg>
  );
}

/** A hanging pennant at the side of the back wall (decoration). */
function Banner({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 10 22"
      width={30}
      height={66}
      aria-hidden
      shapeRendering="crispEdges"
      className={`sprite absolute top-16 hidden min-[380px]:block ${side === "left" ? "left-4" : "right-4"}`}
    >
      <path d="M0 0h10v1H0z" fill="#e3b23c" />
      <path d="M1 1h8v18l-4-3-4 3z" fill="#682f3c" />
      <path d="M1 1h1v17H1z" fill="#7d3a49" />
      <path d="M4 5h2v1H4zM3 6h4v1H3zM4 7h2v4H4z" fill="#e3b23c" />
    </svg>
  );
}
