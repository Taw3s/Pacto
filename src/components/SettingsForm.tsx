"use client";

import { useRouter } from "next/navigation";
import { Camera, Loader, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";
import { formatDayPt, WEEKDAYS_PT } from "@/lib/dates";
import { PushToggle } from "./PushToggle";
import { compressImage, mediaPath } from "@/lib/image";

interface Props {
  groupId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  dayOffToday: number;
  nextWeek: string;
  dayOffNextWeek: number;
}

export function SettingsForm({ groupId, userId, name: initialName, avatarUrl, dayOffToday, nextWeek, dayOffNextWeek }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [dayOff, setDayOff] = useState(dayOffNextWeek);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function saveName() {
    setBusy("name");
    const { error } = await supabase.from("members").update({ display_name: name.trim() }).eq("user_id", userId);
    setBusy("");
    setMsg(error ? "Erro ao salvar o nome." : "Nome salvo.");
    router.refresh();
  }

  async function saveDayOff(weekday: number) {
    setDayOff(weekday);
    setBusy("dayoff");
    const { error } = await supabase.rpc("set_day_off", { p_weekday: weekday });
    setBusy("");
    setMsg(error ? "Erro ao salvar a folga." : `Folga: ${WEEKDAYS_PT[weekday]} a partir de segunda, ${formatDayPt(nextWeek).slice(4)}.`);
    router.refresh();
  }

  async function saveAvatar(file: File | undefined) {
    if (!file) return;
    setBusy("avatar");
    try {
      const blob = await compressImage(file, 512);
      const path = mediaPath(groupId, userId, "avatar");
      const up = await supabase.storage.from("media").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await supabase.from("members").update({ avatar_path: path }).eq("user_id", userId);
      if (error) throw error;
      setMsg("Foto atualizada.");
      router.refresh();
    } catch {
      setMsg("Erro ao enviar a foto.");
    }
    setBusy("");
  }

  async function logout() {
    // The device's push subscription belongs to this account: without this, its notices keep arriving after logout.
    try {
      const sub = await (await navigator.serviceWorker?.getRegistration())?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    } catch {
      // Best effort: never block logging out.
    }
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const dirty = name.trim() !== initialName;
  // Don't lose an unsaved name silently when leaving the page.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const failed = msg.startsWith("Erro");

  return (
    <div className="space-y-6">
      <section aria-labelledby="identidade" className="card space-y-4">
        <h2 id="identidade" className="pixel text-xl uppercase leading-6">
          Identidade
        </h2>
        <div className="flex items-center gap-4">
          <Avatar name={name || "?"} url={avatarUrl} size={64} />
          <label className="btn-secondary cursor-pointer">
            {busy === "avatar" ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" /> : <Camera size={18} aria-hidden />}
            {busy === "avatar" ? "Enviando…" : "Trocar foto"}
            <input type="file" accept="image/*" className="sr-only" data-testid="avatar" onChange={(e) => saveAvatar(e.target.files?.[0])} />
          </label>
        </div>
        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <div className="flex gap-2">
            <input id="name" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-primary" disabled={busy === "name" || !name.trim() || !dirty} onClick={saveName}>
              Salvar
            </button>
          </div>
          {dirty && <p className="mt-1 text-sm text-warn">Alteração não salva.</p>}
        </div>
      </section>

      <section aria-labelledby="folga" className="card">
        <h2 id="folga" className="pixel text-xl uppercase leading-6">
          Dia de folga
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Nesta semana: {WEEKDAYS_PT[dayOffToday]}. A escolha vale a partir da próxima segunda ({formatDayPt(nextWeek).slice(4)}), uma por semana,
          para manter exatamente 1 folga por semana.
        </p>
        <div role="radiogroup" aria-label="Dia de folga" className="grid grid-cols-4 gap-2">
          {WEEKDAYS_PT.map((label, i) => (
            <button
              key={label}
              role="radio"
              aria-checked={dayOff === i}
              disabled={busy === "dayoff"}
              onClick={() => saveDayOff(i)}
              className={`min-h-11 rounded-sm text-sm font-semibold transition-colors duration-150 ${
                dayOff === i ? "bg-accent text-on-accent" : "bg-raised text-muted hover:text-fg"
              }`}
            >
              {label.slice(0, 3)}
            </button>
          ))}
        </div>
      </section>

      {msg && (
        <p className={`text-center text-sm ${failed ? "text-fail" : "text-done"}`} role={failed ? "alert" : "status"}>
          {msg}
        </p>
      )}

      <PushToggle />

      <section aria-labelledby="sessao" className="border-t border-divider pt-6">
        <h2 id="sessao" className="pixel mb-3 text-xl uppercase leading-6">
          Sessão
        </h2>
        <button className="btn-secondary w-full" onClick={logout}>
          <LogOut size={18} aria-hidden />
          Sair
        </button>
      </section>
    </div>
  );
}
