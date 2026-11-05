/* eslint-disable @next/next/no-img-element -- signed URLs */
import { CalendarClock, ChevronRight, Maximize2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiPanel } from "@/components/AiPanel";
import { Avatar } from "@/components/Avatar";
import { BackBar } from "@/components/PageHeader";
import { DisputeActions } from "@/components/DisputeActions";
import { Sprite } from "@/components/Sprite";
import { PhotoViewer } from "@/components/PhotoViewer";
import { TypingCard, type TypingScore } from "@/components/TypingCard";
import { ReactionBar, type ReactionKind } from "@/components/ReactionBar";
import { photoDaysBefore } from "@/lib/photo-date";
import { DEVICE_LABEL, typingLabel } from "@/lib/typing";
import { AiAuthorship, PrimaryBadge } from "@/components/StatusBadges";
import { Courtroom } from "@/components/tribunal/Courtroom";
import { TribunalTabs } from "@/components/tribunal/TribunalTabs";
import { CheckinAttachments } from "@/components/CheckinAttachments";
import { addDays, formatDayPt, spToday } from "@/lib/dates";
import { getMembers, requireMember, signUrls } from "@/lib/data";
import { thumbPath } from "@/lib/image";
import { KEEP_FULL_DAYS } from "@/lib/media-retention";
import { GOAL_ICON } from "@/lib/goal-icons";
import { studyPrompt } from "@/lib/study-prompts";
import { checkinNumbers, goalMeta, type Checkin, type CheckinReview, type Dispute, type DisputeResult, type DisputeVote, type Member } from "@/lib/types";

export const dynamic = "force-dynamic";

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me } = await requireMember();

  // One round trip for everything about this proof (RLS limits it to the caller's group).
  const [{ data: checkin }, members, { data: dispute }, { data: result }, { data: review }, { data: retake }, { data: group }, { data: reactionRows }] = await Promise.all([
    supabase.from("checkins").select("*, typing_tests(wpm, accuracy, device, minutes)").eq("id", id).maybeSingle<Checkin & { typing_tests: { wpm: number; accuracy: number; device: "pc" | "mobile"; minutes: number } | null }>(),
    getMembers(supabase),
    supabase.from("disputes").select("*, dispute_votes(*)").eq("checkin_id", id).maybeSingle<Dispute & { dispute_votes: DisputeVote[] }>(),
    supabase.from("dispute_results").select("*").eq("checkin_id", id).maybeSingle<DisputeResult>(),
    supabase.from("checkin_reviews").select("*").eq("checkin_id", id).maybeSingle<CheckinReview>(),
    supabase.from("checkins").select("id").eq("retake_of", id).maybeSingle<{ id: string }>(),
    supabase.from("groups").select("name").maybeSingle<{ name: string }>(),
    supabase.from("checkin_reactions").select("user_id, kind").eq("checkin_id", id).order("created_at"),
  ]);
  if (!checkin) notFound();
  // Typing: the proof shows the day's best test (what scores), not only the first one it was sent with.
  // A retake only exists because the first proof was annulled: tests judged on it (finished before it) do not count.
  const { data: condemned } = checkin.typing_tests && checkin.retake_of
    ? await supabase.from("checkins").select("created_at").eq("id", checkin.retake_of).maybeSingle<{ created_at: string }>()
    : { data: null };
  let bestQuery = supabase
    .from("typing_tests")
    .select("wpm, accuracy, device, minutes")
    .eq("user_id", checkin.user_id)
    .eq("day", checkin.day)
    .not("score", "is", null);
  if (condemned) bestQuery = bestQuery.gt("finished_at", condemned.created_at);
  const { data: bestTest } = checkin.typing_tests
    ? await bestQuery.order("score", { ascending: false }).limit(1).maybeSingle<TypingScore>()
    : { data: null };
  const typingShown = bestTest ?? checkin.typing_tests;
  const votes = [...(dispute?.dispute_votes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const byId = new Map(members.map((m) => [m.user_id, m]));
  const owner = byId.get(checkin.user_id);
  const ownerName = owner?.display_name ?? "?";
  // Jurors: everyone but the defendant who was in the group when the tribunal opened.
  const jurors = dispute ? members.filter((m) => m.user_id !== checkin.user_id && m.created_at <= dispute.created_at) : [];
  const accuserMember = dispute?.author_id ? byId.get(dispute.author_id) : undefined;
  const photoPaths = [checkin.photo_path, ...(checkin.extra_photos ?? [])];
  const urls = await signUrls(supabase, [...photoPaths, thumbPath(checkin.photo_path), owner?.avatar_path, accuserMember?.avatar_path, ...jurors.map((m) => m.avatar_path)]);
  const { data: attachmentRows } = await supabase.from("checkin_attachments").select("id,kind,storage_path,display_name,size_bytes,expired_at").eq("checkin_id", id);
  const attachments = await Promise.all((attachmentRows ?? []).map(async (item) => {
    // After KEEP_FULL_DAYS the file is gone (0030): no link to sign.
    const expired = !!item.expired_at;
    const { data } = expired ? { data: null } : await supabase.storage.from("attachments").createSignedUrl(item.storage_path, 60 * 60, { download: item.display_name });
    const kind = item.kind as "study_pdf" | "project_zip";
    return { kind, display_name: item.display_name, size_bytes: item.size_bytes, expired, url: data?.signedUrl ?? null };
  }));
  const fullPhotos = photoPaths.map((p) => urls.get(p)).filter((u): u is string => !!u);
  // After KEEP_FULL_DAYS only the first photo's thumbnail is kept (media-retention.ts).
  const trimmed = fullPhotos.length === 0 && !!urls.get(thumbPath(checkin.photo_path));
  const photos = trimmed ? [urls.get(thumbPath(checkin.photo_path))!] : fullPhotos;
  const photo = photos[0];
  const avatar = (m?: Member) => (m?.avatar_path ? (urls.get(m.avatar_path) ?? null) : null);
  const goal = goalMeta(checkin.goal);
  const GoalIcon = GOAL_ICON[checkin.goal];
  // Typing made in the app shows the server-measured result of the day's best test.
  const value = typingShown ? `${typingLabel(typingShown)} · ${DEVICE_LABEL[typingShown.device]}` : checkinNumbers(checkin);
  const question = studyPrompt(checkin.study_prompt);
  // The date the file reports (EXIF, or the file's own date): context, never proof either way.
  const daysBefore = photoDaysBefore(checkin.photo_taken_at, checkin.day);
  const photoAge = daysBefore > 0 ? `O arquivo informa uma data de ${daysBefore === 1 ? "1 dia" : `${daysBefore} dias`} antes do envio.` : null;
  const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const kind = checkin.extra ? "Sessão extra de estudo" : checkin.retake_of ? `${goal.label} (refeita)` : goal.label;
  const isOwner = checkin.user_id === me.user_id;
  const recent = checkin.day >= addDays(spToday(), -1);
  const canDispute = !dispute && !isOwner && recent;
  const myVote = votes.find((v) => v.voter_id === me.user_id) ?? null;
  const joinedLate = !!dispute && me.created_at > dispute.created_at;
  const accuser = dispute ? (dispute.by_ai ? "Juiz IA" : (byId.get(dispute.author_id ?? "")?.display_name ?? "Ex-membro")) : "";

  const proofAlt = `Prova de ${goal.label.toLowerCase()} enviada por ${ownerName}`;
  const photoBlock = (
    <figure className="mb-4">
      {typingShown ? (
        <TypingCard t={typingShown} size="full" />
      ) : photo ? (
        <>
          <PhotoViewer
            photos={photos}
            alt={proofAlt}
            label={`Ampliar a foto da prova de ${goal.label.toLowerCase()} de ${ownerName}`}
            className="group relative block w-full overflow-hidden rounded-sm border-2 border-bevel-dark bg-surface"
          >
            <img src={photo} alt={proofAlt} className="mx-auto max-h-[60dvh] w-full object-contain" />
            <span className="absolute bottom-2 right-2 inline-flex min-h-9 items-center gap-1 rounded-sm bg-bg/90 px-2 text-xs font-semibold">
              <Maximize2 size={14} aria-hidden /> Ampliar foto
            </span>
          </PhotoViewer>
          {trimmed && (
            <p className="mt-2 text-sm text-muted" data-testid="photo-trimmed">
              Prova com mais de {KEEP_FULL_DAYS} dias: fica guardada só a foto reduzida.
            </p>
          )}
          {photos.length > 1 && (
            <ul className="mt-2 grid grid-cols-4 gap-2" data-testid="proof-photos">
              {photos.map((src, n) => (
                <li key={src}>
                  <PhotoViewer
                    photos={photos}
                    start={n}
                    alt={proofAlt}
                    label={`Ampliar a foto ${n + 1} de ${photos.length}`}
                    className="block aspect-square w-full overflow-hidden rounded-sm border-2 border-bevel-dark bg-surface"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </PhotoViewer>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-sm bg-surface text-sm text-muted">Foto indisponível no momento.</div>
      )}
      {daysBefore > 0 && (
        <figcaption className="mt-2 flex gap-2 rounded-sm border-l-[3px] border-warn bg-surface p-3 text-sm" data-testid="photo-age">
          <CalendarClock size={18} aria-hidden className="mt-0.5 shrink-0 text-warn" />
          <span>
            <span className="block font-semibold">Data do arquivo</span>
            {/* photo_taken_at is the OLDEST date among the proof's photos (TodayChecklist, migration 0009), not the first photo's. */}
            {/* Two lines, each date with its own event: "(3 dias antes)" after the send date read backwards. */}
            <span className="block">
              {photoPaths.length > 1 ? "Data mais antiga informada pelas fotos" : "Data informada pela foto"}: {ddmm(spToday(new Date(checkin.photo_taken_at!)))}.
            </span>
            <span className="block">
              Enviada em {ddmm(checkin.day)}, {daysBefore === 1 ? "1 dia depois" : `${daysBefore} dias depois`}.
            </span>
            <span className="mt-1 block text-muted">Essa data pode estar incorreta ou vir de uma captura ou edição. Ela não comprova quando a atividade aconteceu.</span>
          </span>
        </figcaption>
      )}
    </figure>
  );

  const details = (
    <>
      {(value || checkin.goal === "project") && (
        <dl className="card mb-4">
          <dt className="pixel text-base uppercase text-muted">{checkin.goal === "project" ? "Projeto" : "Informado"}</dt>
          <dd className="pixel tabular text-[32px] font-bold leading-9">{value}</dd>
        </dl>
      )}
      {checkin.goal === "project" && checkin.project_url && (
        <a href={checkin.project_url} target="_blank" rel="noreferrer" className="card mb-4 block break-all underline decoration-accent underline-offset-4">
          Repositório do projeto no GitHub
        </a>
      )}
      {photoBlock}
      <ReactionBar
        checkinId={checkin.id}
        canReact={!isOwner}
        initial={(reactionRows ?? []).map((r) => ({ kind: r.kind as ReactionKind, name: byId.get(r.user_id)?.display_name ?? "?", mine: r.user_id === me.user_id }))}
      />
      {checkin.summary && (
        <section className="mb-4" aria-labelledby="resumo">
          <h2 id="resumo" className="pixel mb-1 text-base uppercase text-muted">
            {question ? "Pergunta do dia" : "Resumo"}
          </h2>
          {question && <p className="mb-1 break-words font-medium" data-testid="proof-question">{question.text}</p>}
          <p className="whitespace-pre-wrap break-words">{checkin.summary}</p>
        </section>
      )}
      <CheckinAttachments
        checkinId={checkin.id}
        goal={checkin.goal}
        // Past KEEP_FULL_DAYS the server refuses new files (they would be deleted the next night).
        canAdd={isOwner && checkin.day >= addDays(spToday(), -KEEP_FULL_DAYS)}
        keepDays={KEEP_FULL_DAYS}
        attachments={attachments}
      />
      <div className="mb-4">
        <AiPanel
          checkinId={checkin.id}
          review={review ? { verdict: review.verdict, seen: review.seen, detected: review.detected, answer: review.answer_check ?? null } : null}
          declaredMinutes={checkin.minutes}
          ownerName={ownerName}
          isOwner={isOwner}
          canRequest={recent}
          closed={!recent && !review}
          secondary={result?.status === "upheld"}
        />
      </div>
    </>
  );

  // The proof as a dossier: the folder on the header only (never over the photos), the real date in plain text.
  const header = (
    <header className="card doc-tab mb-4 flex items-center gap-3 p-3">
      <Sprite name="evidenceFolder" />
      <div className="min-w-0 flex-1">
        <p className="pixel flex items-center gap-1.5 break-words text-xl uppercase leading-6">
          <GoalIcon size={18} aria-hidden className="shrink-0" />
          {kind}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-semibold">{ownerName}</span>
          <span className="text-muted">
            {formatDayPt(checkin.day)} · {time(checkin.created_at)}
          </span>
        </p>
      </div>
      <Avatar name={ownerName} url={avatar(owner)} size={40} />
    </header>
  );

  if (dispute && result && owner) {
    const evidence = (
      <>
        <section className="card mb-4" aria-labelledby="acusacao">
          <h2 id="acusacao" className="pixel flex items-center gap-2 text-lg uppercase text-fail">
            {dispute.by_ai ? <Sprite name="judge-present6" /> : <Avatar name={accuser} url={avatar(byId.get(dispute.author_id ?? ""))} size={32} />}
            Acusação · {accuser}
          </h2>
          <p className="mt-2">{dispute.reason}</p>
        </section>
        <section className="card mb-4" aria-labelledby="defesa">
          <h2 id="defesa" className="pixel flex items-center gap-2 text-lg uppercase text-done">
            <Avatar name={ownerName} url={avatar(owner)} size={32} />
            Defesa · {ownerName}
          </h2>
          {dispute.reply ? (
            <p className="mt-2">{dispute.reply}</p>
          ) : isOwner ? (
            <div className="mt-3">
              <DisputeActions disputeId={dispute.id} canReply />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{ownerName} ainda não se defendeu.</p>
          )}
        </section>
        <p className="pixel mb-2 flex items-center gap-1.5 text-base uppercase text-muted">
          <GoalIcon size={16} aria-hidden />
          Prova de {goal.label.toLowerCase()} · {formatDayPt(checkin.day)} · {time(checkin.created_at)}
        </p>
        {details}
      </>
    );

    const pending = jurors.filter((m) => !votes.some((v) => v.voter_id === m.user_id));
    const voteList = (
      <>
        {votes.length === 0 ? (
          <p className="text-sm text-muted">Ninguém votou ainda.</p>
        ) : (
          <ul className="space-y-3">
            {votes.map((v) => {
              const m = v.voter_id ? byId.get(v.voter_id) : undefined;
              return (
                <li key={`${v.voter_id ?? "ex"}-${v.created_at}`} className="card flex gap-3" data-vote-by={m?.display_name}>
                  <Avatar name={m?.display_name ?? "?"} url={avatar(m)} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                      {m?.display_name ?? "Ex-membro"}
                      <span className={`pixel text-base uppercase ${v.upheld ? "text-fail" : "text-done"}`}>{v.upheld ? "Anular" : "Manter"}</span>
                      <span className="text-xs font-normal text-muted">{time(v.created_at)}</span>
                    </p>
                    <p className="mt-1 break-words text-sm">{v.reason ?? <span className="text-muted">Sem motivo (voto antigo).</span>}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {result.status === "open" && pending.length > 0 && (
          <p className="mt-4 text-sm text-muted">Ainda não votaram: {pending.map((m) => m.display_name).join(", ")}.</p>
        )}
      </>
    );

    return (
      <div data-wide className="desk:grid desk:grid-cols-[minmax(0,1fr)_420px] desk:items-start desk:gap-8">
        <div className="min-w-0">
        <BackBar fallback="/feed" />
        <Courtroom
          disputeId={dispute.id}
          result={result}
          groupName={group?.name ?? "Pacto"}
          defendant={owner}
          defendantAvatar={avatar(owner)}
          accuser={accuser}
          accuserAvatar={avatar(accuserMember)}
          byAi={dispute.by_ai}
          proof={{ goal: kind, day: formatDayPt(checkin.day), value, photos, ai: review?.verdict ?? null, photoAge }}
          jurors={jurors.map((m) => ({ member: m, avatarUrl: avatar(m), vote: votes.find((v) => v.voter_id === m.user_id) ?? null }))}
          me={{ id: me.user_id, isOwner, canVote: !isOwner && !joinedLate && !myVote, vote: myVote, joinedLate }}
        />
        {result.status === "upheld" && (retake || (isOwner && checkin.day === spToday() && !checkin.extra)) && (
          <Link href={retake ? `/checkin/${retake.id}` : "/hoje"} className="card mb-4 flex min-h-12 items-center gap-2 !border-warn" data-testid="retake-link">
            <RotateCcw size={20} aria-hidden className="shrink-0 text-warn" />
            <span className="min-w-0 flex-1">{retake ? `${ownerName} refez esta prova. Ver a nova.` : "Você pode refazer esta prova até 23:59. Ir para Hoje."}</span>
            <ChevronRight size={20} aria-hidden className="shrink-0 text-muted" />
          </Link>
        )}
        </div>
        <div className="desk:sticky desk:top-6">
          <TribunalTabs evidence={evidence} votes={voteList} voteCount={votes.length} />
        </div>
      </div>
    );
  }

  return (
    <>
      <BackBar fallback="/feed" />
      {header}
      {review && (
        <div className="mb-4">
          <PrimaryBadge ai={review.verdict} />
          <AiAuthorship state={review.verdict} />
        </div>
      )}
      {details}
      {canDispute && <DisputeActions checkinId={checkin.id} canDispute />}
      {isOwner && <p className="text-sm text-muted">Provas enviadas não podem ser editadas, só contestadas pelo grupo.</p>}
    </>
  );
}
