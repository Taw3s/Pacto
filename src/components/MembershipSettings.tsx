"use client";

import { LogOut, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SUPPORT_URL } from "@/lib/support";

interface Props {
  isOwner: boolean;
  groupName: string;
  /** The other members, oldest first (the first one inherits the group if the owner leaves). */
  others: { id: string; name: string }[];
}

type Member = { id: string; name: string };
type Outcome = "ok" | "gone" | "failed";

/** POST to /api/membership. A 4xx means the server refused (target gone, no permission); anything else is uncertain. */
async function post(body: object): Promise<{ outcome: Outcome; inviteCode?: string | null }> {
  const res = await fetch("/api/membership", { method: "POST", body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (res?.ok) return { outcome: "ok", inviteCode: ((await res.json().catch(() => ({}))) as { inviteCode?: string | null }).inviteCode ?? null };
  return { outcome: res && res.status >= 400 && res.status < 500 ? "gone" : "failed" };
}

/** Tells GroupSettings that the invite code is changing (removal sent) and what the server confirmed. */
export type InviteEvent = { phase: "rotating" } | { phase: "rotated"; code: string | null } | { phase: "unchanged" };
export const INVITE_EVENT = "pacto:invite";
const tellInvite = (detail: InviteEvent) => window.dispatchEvent(new CustomEvent<InviteEvent>(INVITE_EVENT, { detail }));

/**
 * Leaving the group, removing a member (owner only) and deleting the account. Removing and leaving
 * ask in a dialog that says what happens to the group's history: it stays (payments, accusations
 * and votes keep counting), unless the last person leaves and the group is deleted.
 */
export function MembershipSettings({ isOwner, groupName, others }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  // The open dialog: removing someone, leaving or deleting the account.
  const [asking, setAsking] = useState<{ kind: "remove"; member: Member } | { kind: "leave" } | { kind: "delete" } | null>(null);
  // Deleting the account asks for EXCLUIR typed (same normalization as before: outer spaces and case don't matter).
  const [typed, setTyped] = useState("");
  const typedOk = typed.trim().toUpperCase() === "EXCLUIR";
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [gone, setGone] = useState(false);
  // After a removal the dialog stays on "Removendo…" until the list is refreshed, then closes.
  const [refreshing, startRefresh] = useTransition();
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (closing && !refreshing) {
      setClosing(false);
      setSending(false);
      setAsking(null);
    }
  }, [closing, refreshing]);

  function ask(next: NonNullable<typeof asking>) {
    setError("");
    setGone(false);
    setMsg("");
    setTyped("");
    setAsking(next);
  }

  async function confirmAsked() {
    if (!asking || sending) return;
    if (asking.kind === "delete" && !typedOk) return;
    setSending(true);
    setError("");
    if (asking.kind === "delete") {
      const res = await fetch("/api/account", { method: "DELETE", signal: AbortSignal.timeout(30_000) }).catch(() => null);
      // Keeps "Excluindo…" until the login page shows up.
      if (res?.ok) return router.replace("/login");
      setSending(false);
      // The server may have done part of it (left the group) before failing; trying again is safe: it only finishes what is left.
      setError("Não foi possível confirmar a conclusão da exclusão. Parte da operação pode ter sido realizada.");
      return;
    }
    if (asking.kind === "remove") {
      const { member } = asking;
      tellInvite({ phase: "rotating" });
      const { outcome: r, inviteCode } = await post({ action: "remove", userId: member.id });
      tellInvite(r === "ok" ? { phase: "rotated", code: inviteCode ?? null } : { phase: "unchanged" });
      if (r === "ok") {
        setMsg(`Você removeu ${member.name} do grupo.`);
        setClosing(true);
        startRefresh(() => router.refresh());
        return;
      }
      setSending(false);
      if (r === "gone") setGone(true);
      else setError("Não foi possível confirmar a remoção. Confira sua conexão e tente novamente.");
    } else {
      const { outcome: r } = await post({ action: "leave" });
      // Keeps "Saindo…" until the next page shows up.
      if (r === "ok") return router.replace("/join?step=code");
      setSending(false);
      if (r === "gone") setGone(true);
      else setError("Não foi possível confirmar sua saída. Confira sua conexão e tente novamente.");
    }
  }

  // The oldest other member inherits the group (same order as _drop_member); nobody left: it is deleted.
  const heir = others[0]?.name;
  // While the dialog closes, keep showing what it asked (no flash of the other dialog's text).
  const last = useRef(asking);
  if (asking) last.current = asking;
  const shown = asking ?? last.current;
  const removing = shown?.kind === "remove" ? shown.member : null;
  const deleting = shown?.kind === "delete";
  return (
    <section className="card mb-4 space-y-4" aria-labelledby="membros" data-testid="membership">
      {isOwner && others.length > 0 && (
        <div>
          <h2 id="membros" tabIndex={-1} className="pixel text-xl uppercase leading-6">
            Membros
          </h2>
          <p className="text-sm text-muted">Só quem criou o desafio remove alguém.</p>
          <ul className="mt-2 divide-y divide-divider">
            {others.map((m) => (
              <li key={m.id} className="flex min-h-12 items-center gap-3 py-1" data-member-row={m.name}>
                <span className="min-w-0 flex-1 break-words">{m.name}</span>
                <button
                  type="button"
                  className="btn-secondary min-h-11 shrink-0 !px-3 text-sm"
                  disabled={sending}
                  onClick={() => ask({ kind: "remove", member: m })}
                  aria-label={`Remover ${m.name}`}
                  aria-haspopup="dialog"
                >
                  <UserMinus size={16} aria-hidden />
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h2 id={isOwner && others.length > 0 ? "sair" : "membros"} tabIndex={-1} className="pixel text-base uppercase text-muted">
          Sair
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary min-h-11 text-sm" disabled={sending} onClick={() => ask({ kind: "leave" })} aria-haspopup="dialog">
            <LogOut size={16} aria-hidden />
            Sair do grupo
          </button>
          <button type="button" className="btn-secondary min-h-11 text-sm" disabled={sending} onClick={() => ask({ kind: "delete" })} aria-haspopup="dialog">
            <Trash2 size={16} aria-hidden className="text-fail" />
            Excluir minha conta
          </button>
        </div>
      </div>
      <p className="text-sm text-muted" role="status">
        {msg}
      </p>
      <p className="text-sm text-muted">
        <a href="/privacidade" className="inline-flex min-h-11 items-center underline">
          Política de privacidade
        </a>
        <span aria-hidden> · </span>
        <a href="/termos" className="inline-flex min-h-11 items-center underline">
          Termos de uso
        </a>
        {SUPPORT_URL && (
          <>
            <span aria-hidden> · </span>
            <a href="/apoiar" className="inline-flex min-h-11 items-center underline">
              Apoiar o projeto
            </a>
          </>
        )}
      </p>

      <ConfirmDialog
        open={!!asking}
        variant="danger"
        sprite="evidenceFolder"
        title={deleting ? "Excluir minha conta?" : removing ? `Remover ${removing.name} do grupo?` : `Sair de ${groupName}?`}
        confirmLabel={deleting ? "Excluir minha conta" : removing ? "Remover do grupo" : "Sair do grupo"}
        confirmIcon={deleting ? <Trash2 size={16} aria-hidden /> : removing ? <UserMinus size={16} aria-hidden /> : <LogOut size={16} aria-hidden />}
        cancelLabel={deleting || removing ? "Cancelar" : "Continuar no grupo"}
        busy={sending}
        busyLabel={deleting ? "Excluindo…" : removing ? "Removendo…" : "Saindo…"}
        confirmDisabled={deleting && !typedOk}
        error={error}
        notice={
          gone
            ? {
                message: "Esta ação não está mais disponível. Atualize a lista para continuar.",
                actionLabel: "Atualizar lista",
                onAction: () => {
                  setAsking(null);
                  router.refresh();
                },
              }
            : null
        }
        onConfirm={confirmAsked}
        onCancel={() => setAsking(null)}
        fallbackFocus={() => document.getElementById("membros") ?? document.getElementById("sair")}
      >
        {deleting ? (
          <>
            <p>Sua conta será excluída permanentemente. Suas provas, fotos, dívidas e testes de digitação serão apagados. Esta ação não pode ser desfeita.</p>
            {heir ? (
              <p>Os registros de recebimentos, acusações e votos que fazem parte do histórico do grupo continuam existindo.</p>
            ) : (
              <p>Você é a última pessoa deste grupo. O grupo e seu histórico também serão apagados.</p>
            )}
            {isOwner && heir && <p data-testid="heir">{heir} ficará responsável pelo grupo.</p>}
            <p className="text-sm text-muted">Um registro de participação sem vínculo com sua conta é mantido por até um ano, conforme a Política de Privacidade.</p>
            <div>
              <label className="label" htmlFor="delete-confirm">
                Digite EXCLUIR para confirmar
              </label>
              {/* No form: Enter in the field never deletes the account by itself. */}
              <input
                id="delete-confirm"
                className="input mt-1"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={typed}
                disabled={sending}
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>
          </>
        ) : removing ? (
          <>
            <p>
              {removing.name} perderá o acesso a este grupo. As provas, fotos e dívidas dessa pessoa serão removidas do grupo. Os pagamentos que ela recebeu, as
              acusações e os votos continuam valendo no histórico.
            </p>
            <p>
              O código de convite será trocado automaticamente. O código e os links anteriores deixarão de funcionar para novas entradas. Compartilhe o novo
              link com quem ainda quiser convidar.
            </p>
            <p className="font-semibold">Remover do grupo não exclui a conta da pessoa.</p>
          </>
        ) : (
          <>
            <p>
              Você perderá o acesso a este grupo.{" "}
              {heir
                ? "Suas provas, fotos e dívidas serão removidas dele. Os pagamentos que você recebeu, suas acusações e seus votos continuam valendo no histórico."
                : "Você é a última pessoa. Ao sair, o grupo e seu histórico serão apagados."}
            </p>
            {isOwner && heir && <p data-testid="heir">{heir} ficará responsável pelo grupo.</p>}
            <p className="font-semibold">Sua conta continuará existindo.</p>
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}
