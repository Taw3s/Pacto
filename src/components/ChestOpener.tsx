"use client";

import { Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { collectible, RARITY_LABEL, RARITY_TONE, UNKNOWN_COLLECTIBLE, type Rarity } from "@/lib/collectibles";
import { createClient } from "@/lib/supabase/client";
import { Sprite, type SpriteName } from "./Sprite";

export interface OpenedItem {
  itemId: string;
  rarity: Rarity;
}

const SPIN: SpriteName[] = ["chest1", "chest2", "chest3"];

/**
 * A chest that spins only while the server draws the item, then shows it. The draw happens in the
 * database (open_chest): this component only plays it. The result text appears as soon as the server
 * confirms, with or without motion; the 4-step rise of the item is decoration, once per new opening.
 * "New" / "duplicate" are not claimed: open_chest's `already` only means this chest was opened before.
 */
export function ChestOpener({ kind, opened, label }: { kind: "daily" | "weekly"; opened: OpenedItem | null; label: string }) {
  const [item, setItem] = useState<OpenedItem | null>(opened);
  const [frame, setFrame] = useState<SpriteName>("chest1");
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">(opened ? "done" : "idle");
  // fresh: opened by this click (rises once); repeat: the server says this chest was already opened.
  const [how, setHow] = useState<"stored" | "fresh" | "repeat">("stored");
  const [error, setError] = useState("");
  const spin = useRef<ReturnType<typeof setInterval> | null>(null);
  const alive = useRef(true);
  const stopSpin = () => {
    if (spin.current !== null) clearInterval(spin.current);
    spin.current = null;
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopSpin();
    };
  }, []);

  async function open() {
    if (phase !== "idle") return;
    setError("");
    setPhase("spinning");
    // Reduced motion: no frame swapping at all, just the spinner text in the button.
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let i = 0;
      spin.current = setInterval(() => setFrame(SPIN[++i % SPIN.length]), 140);
    }
    let won: (OpenedItem & { already: boolean }) | null = null;
    try {
      // open_chest is idempotent: asking again after a lost answer returns the item already stored
      // instead of drawing a new one, so a retry is always safe.
      const { data, error } = await createClient().rpc("open_chest", { p_kind: kind });
      const row = Array.isArray(data) ? data[0] : null;
      if (!error && row) won = { itemId: row.item_id as string, rarity: row.rarity as Rarity, already: row.already === true };
    } catch {
      won = null;
    } finally {
      stopSpin();
    }
    if (!alive.current) return;
    setFrame("chest1");
    if (!won) {
      setPhase("idle");
      setError("Não foi possível confirmar a abertura. Tente novamente.");
      return;
    }
    setItem({ itemId: won.itemId, rarity: won.rarity });
    setHow(won.already ? "repeat" : "fresh");
    setPhase("done");
  }

  const info = item ? collectible(item.itemId) : null;
  const name = info?.name ?? UNKNOWN_COLLECTIBLE;
  return (
    <div className="flex items-center gap-4" data-testid={`chest-${kind}`} data-phase={phase}>
      <div className="relative size-24 shrink-0">
        {item ? (
          <span className={`block ${how === "fresh" ? "animate-[rise_240ms_steps(4)_both] motion-reduce:animate-none" : ""}`} data-testid="chest-item-sprite">
            <Sprite name={info?.id ?? "chest6"} scale={2} />
          </span>
        ) : (
          <Sprite name={frame} scale={2} className={phase === "idle" ? "animate-[bob_1.2s_steps(2)_3] motion-reduce:animate-none" : ""} />
        )}
      </div>
      <div className="min-w-0" aria-live="polite">
        {item ? (
          <>
            <p className="text-sm leading-5 text-muted">{how === "repeat" ? "Este baú já foi aberto." : "Você recebeu"}</p>
            <p className="pixel break-words text-2xl font-bold uppercase leading-7" data-testid="chest-item">
              {name}
            </p>
            <p className={`text-sm font-semibold leading-5 ${RARITY_TONE[item.rarity]}`}>{RARITY_LABEL[item.rarity]}</p>
            <p className="mt-1 text-sm leading-5 text-muted">Guardado na sua coleção, no Perfil.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">{label}</p>
            <button className="btn-primary mt-2" onClick={open} disabled={phase !== "idle"}>
              {phase === "idle" ? "Abrir baú" : <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />}
              {phase === "idle" ? "" : "Abrindo…"}
            </button>
            {error && (
              <p role="alert" className="mt-2 text-sm text-fail">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
