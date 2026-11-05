"use client";

import { Bell, BellOff, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "elsewhere": the browser has a subscription but this account has no row for it (another account, or the row is gone).
type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "elsewhere" | "unverified";

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** "on" only when this account owns the browser's subscription; RLS shows a member only their own rows. */
async function check(): Promise<State> {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return ios && !standalone ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return "off";
  const { count, error } = await createClient().from("push_subscriptions").select("id", { count: "exact", head: true }).eq("endpoint", sub.endpoint);
  if (error) return "unverified";
  return count ? "on" : "elsewhere";
}

/** Settings: turn this device's notices on/off (friends closing the day, 20:00 reminder, weekly chest). */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function verify() {
    setState("loading");
    check()
      .then(setState)
      .catch(() => setState("unverified"));
  }

  useEffect(verify, []);


  async function enable() {
    setBusy(true);
    setError("");
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      // A fresh endpoint: an old one may still be bound to another account, which this one cannot see or replace.
      await (await reg.pushManager.getSubscription())?.unsubscribe();
      const { publicKey } = await fetch("/api/push/key").then((r) => (r.ok ? r.json() : Promise.reject()));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const json = sub.toJSON();
      const supabase = createClient();
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      const { error } = await supabase.from("push_subscriptions").insert({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth });
      if (error) throw error;
      setState("on");
    } catch {
      setError(state === "elsewhere" ? "Não foi possível ativar para esta conta. Tente novamente." : "Não foi possível ativar neste aparelho. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Não foi possível desativar agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="avisos" className="card" data-testid="push-settings" data-state={state}>
      <h2 id="avisos" className="pixel flex items-center gap-2 text-xl uppercase leading-6">
        <Bell size={20} aria-hidden /> Avisos
      </h2>
      <p className="mt-1 text-sm text-muted">
        Quando alguém do grupo fecha o dia, um lembrete às 20:00 se faltar meta e o baú da semana. No máximo um de cada por dia.
      </p>
      <div className="mt-3">
        {state === "loading" ? null : state === "on" ? (
          <>
          <p className="mb-2 text-sm" role="status">Avisos ativados para esta conta neste aparelho.</p>
          <button className="btn-secondary w-full" onClick={disable} disabled={busy}>
            {busy ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite]" /> : <BellOff size={18} aria-hidden />}
            Desativar avisos neste aparelho
          </button>
          </>
        ) : state === "off" ? (
          <>
          <p className="mb-2 text-sm" role="status">Avisos desativados para esta conta neste aparelho.</p>
          <button className="btn-primary w-full" onClick={enable} disabled={busy}>
            {busy ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite]" /> : <Bell size={18} aria-hidden />}
            Ativar avisos neste aparelho
          </button>
          </>
        ) : state === "elsewhere" ? (
          <div className="rounded-sm border-2 border-warn bg-warn-bg p-3">
            <p className="flex items-start gap-2 text-sm leading-5" role="status">
              <BellOff size={18} aria-hidden className="mt-0.5 shrink-0" />
              <span>
                Este aparelho não está recebendo os avisos desta conta.
                <br />
                Ative os avisos para receber as notificações da conta que você está usando agora.
              </span>
            </p>
            <button className="btn-primary mt-3 min-h-12 w-full" onClick={enable} disabled={busy}>
              {busy ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" /> : <Bell size={18} aria-hidden />}
              {busy ? "Ativando para esta conta…" : "Ativar para esta conta"}
            </button>
          </div>
        ) : state === "unverified" ? (
          <>
            <p className="mb-2 text-sm" role="status">Não foi possível verificar os avisos.</p>
            <button className="btn-secondary w-full" onClick={verify}>
              Tentar novamente
            </button>
          </>
        ) : (
          <p className="text-sm" role="status">
            {state === "ios-install"
              ? "No iPhone, os avisos só funcionam com o Pacto instalado: toque em Compartilhar → Adicionar à Tela de Início e abra por lá."
              : state === "denied"
                ? "Os avisos estão bloqueados para este site. Libere nas configurações do navegador e volte aqui."
                : "Este navegador não recebe avisos."}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-fail">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
