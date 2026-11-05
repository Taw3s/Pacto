"use client";

import { Copy, Link2, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatDayPt } from "@/lib/dates";
import { menuPhrase, type DebtItem } from "@/lib/debt-items";
import { inviteUrl } from "@/lib/invite";
import { createClient } from "@/lib/supabase/client";
import { INVITE_EVENT, type InviteEvent } from "./MembershipSettings";
import { MenuPicker } from "./MenuPicker";

interface Props {
  groupName: string;
  inviteCode: string;
  isOwner: boolean;
  menuToday: DebtItem[];
  /** A change already scheduled for a coming Monday. */
  menuNext: { from: string; items: DebtItem[] } | null;
}

/**
 * The challenge: its invite code (anyone in it can invite) and the debt menu. Only the owner
 * changes the menu, and the change applies from the next Monday, so nobody is caught off guard.
 */
export function GroupSettings({ groupName, inviteCode, isOwner, menuToday, menuNext }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState<DebtItem[]>(menuNext?.items ?? menuToday);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState<"" | "code" | "link" | "failed">("");
  // Removing a member rotates the code (0026). Only a value confirmed by the server is ever shown or copied.
  const [code, setCode] = useState(inviteCode);
  const [rotation, setRotation] = useState<"" | "updating" | "done" | "failed">("");
  const before = useRef(inviteCode);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<InviteEvent>).detail;
      setCopied("");
      if (d.phase === "rotating") return setRotation((r) => (r === "done" ? r : "updating"));
      if (d.phase === "unchanged") return setRotation((r) => (r === "updating" ? "" : r));
      if (d.code) {
        setCode(d.code);
        setRotation("done");
      } else setRotation("failed");
    };
    window.addEventListener(INVITE_EVENT, on);
    return () => window.removeEventListener(INVITE_EVENT, on);
  }, []);

  // The page reloaded with a new code (after "Atualizar convite" or the refresh that follows a removal).
  useEffect(() => {
    if (inviteCode === before.current) return;
    before.current = inviteCode;
    setCode(inviteCode);
    setRotation((r) => (r === "failed" || r === "updating" ? "done" : r));
  }, [inviteCode]);

  const locked = rotation === "updating" || rotation === "failed";
  const pending = menuNext?.items ?? menuToday;
  const changed = menu.join() !== pending.join();

  async function copy(what: "code" | "link") {
    try {
      if (locked) return;
      await navigator.clipboard.writeText(what === "code" ? code : inviteUrl(window.location.origin, code));
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("failed");
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    const { data, error } = await createClient().rpc("set_debt_menu", { p_items: menu });
    setBusy(false);
    setMsg(error ? "Não foi possível salvar o cardápio." : `Salvo. Vale a partir de ${formatDayPt(String(data))}.`);
    router.refresh();
  }

  return (
    <section className="card mb-4 space-y-4" aria-labelledby="desafio" data-testid="group-settings">
      <div>
        <h2 id="desafio" className="pixel text-xl uppercase leading-6">
          {groupName}
        </h2>
        <p className="text-sm text-muted">Convide amigos com este código:</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="pixel tabular flex-1 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 text-2xl tracking-widest" data-testid="invite-code">
            {rotation === "updating" || rotation === "failed" ? "········" : code}
          </code>
          <button type="button" className="btn-secondary min-h-12 min-w-12 !px-3" onClick={() => copy("code")} disabled={locked} aria-label="Copiar código de convite">
            <Copy size={18} aria-hidden />
          </button>
        </div>
        <button type="button" className="btn-secondary mt-2 min-h-12 w-full !text-base sm:w-auto" onClick={() => copy("link")} disabled={locked}>
          <Link2 size={18} aria-hidden /> Copiar link do convite
        </button>
        {rotation === "done" && (
          <div className="mt-2 text-sm leading-5" data-testid="invite-rotated">
            <p className="text-fg">Código de convite atualizado.</p>
            <p className="text-muted">O código e os links anteriores não funcionam mais. Copie o novo link para convidar alguém.</p>
          </div>
        )}
        {rotation === "failed" && (
          <div className="mt-2 text-sm leading-5" role="alert">
            <p className="text-fg">A remoção foi concluída, mas não foi possível carregar o novo convite.</p>
            <button type="button" className="btn-secondary mt-2 min-h-12" onClick={() => router.refresh()}>
              Atualizar convite
            </button>
          </div>
        )}
        <p className="mt-1 text-xs text-muted" role="status">
          {rotation === "updating"
            ? "Atualizando convite…"
            : copied === "code"
            ? "Código copiado."
            : copied === "link"
              ? rotation === "done" ? "Novo link copiado." : "Link copiado. Agora envie para seus amigos."
              : copied === "failed"
                ? "Não foi possível copiar. Copie o código manualmente."
                : "Quem entrar com ele começa a dever a partir do dia seguinte."}
        </p>
      </div>

      <div>
        <h3 className="pixel text-base uppercase text-muted">Cardápio da dívida</h3>
        <p className="text-sm">
          Hoje, cada dia descumprido vale <b data-testid="settings-menu-today">{menuPhrase(menuToday)}</b>.
        </p>
        {menuNext && (
          <p className="text-sm text-muted" data-testid="settings-menu-next">
            A partir de {formatDayPt(menuNext.from)}: {menuPhrase(menuNext.items)}.
          </p>
        )}
        {isOwner ? (
          <div className="mt-3 space-y-2">
            <MenuPicker value={menu} onChange={setMenu} disabled={busy} />
            <button type="button" className="btn-primary w-full" disabled={busy || !changed} onClick={save}>
              {busy && <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />}
              Salvar cardápio
            </button>
            <p className="text-xs text-muted">A troca vale a partir da segunda seguinte; dias que já passaram continuam com os itens de antes.</p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted">Só quem criou o desafio troca o cardápio.</p>
        )}
        {msg && (
          <p className="mt-2 text-sm" role="status">
            {msg}
          </p>
        )}
      </div>
    </section>
  );
}
