"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { COLLECTIBLES, copies, RARITY_LABEL, RARITY_TONE, UNKNOWN_COLLECTIBLE } from "@/lib/collectibles";
import { CollectionItemDialog } from "./CollectionItemDialog";
import { Sprite } from "./Sprite";

type Item = (typeof COLLECTIBLES)[number];

/**
 * Perfil: the objects won in chests. Owned ones are buttons that open their card; missing ones are
 * plain silhouettes ("???", no name anywhere, only a visual surprise: the catalog ships with the app).
 * Two columns until the shelf itself has 560 px, so a narrow column on desktop stays at two.
 */
export function CollectionShelf({ counts, isMe, failed, expansionNote }: { counts: Record<string, number> | null; isMe: boolean; failed: boolean; expansionNote: boolean }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const [open, setOpen] = useState<Item | null>(null);

  if (failed || !counts) {
    return (
      <section className="card mb-4" aria-labelledby="colecao" data-testid="collection">
        <h2 id="colecao" className="pixel text-xl uppercase leading-6">
          Coleção
        </h2>
        <p role="alert" className="mt-3 text-sm leading-5 text-fail">
          Não foi possível carregar a coleção.
        </p>
        <button type="button" className="btn-secondary mt-3 min-h-12" disabled={retrying} onClick={() => startRetry(() => router.refresh())}>
          Tentar novamente
        </button>
      </section>
    );
  }

  const owned = COLLECTIBLES.filter((c) => (counts[c.id] ?? 0) > 0).length;
  // Openings of ids this version does not know yet (a newer catalog in the database): kept, never hidden.
  const unknown = Object.entries(counts).filter(([id, n]) => n > 0 && !COLLECTIBLES.some((c) => c.id === id));

  return (
    <section className="card mb-4" aria-labelledby="colecao" data-testid="collection">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 id="colecao" className="pixel text-xl uppercase leading-6">
          Coleção
        </h2>
        <p className="pixel tabular text-lg text-accent" data-testid="collection-count" aria-label={`${owned} de ${COLLECTIBLES.length} objetos`}>
          {owned}/{COLLECTIBLES.length}
        </p>
      </div>
      {owned > 0 && <p className="mb-3 text-sm leading-5 text-muted">Toque em um objeto para conhecer sua história.</p>}
      {expansionNote && owned > 0 && (
        <p className="mb-3 text-sm leading-5 text-fg" data-testid="collection-expansion">
          A coleção cresceu: agora são {COLLECTIBLES.length} objetos. Os seus continuam aqui.
        </p>
      )}
      <div className="@container">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-4 @min-[560px]:grid-cols-4">
          {COLLECTIBLES.map((c) => {
            const n = counts[c.id] ?? 0;
            if (!n)
              return (
                <li key={c.id} className="flex min-h-[112px] flex-col items-center gap-1 p-2 text-center" data-collectible={c.id} data-owned="false">
                  <Sprite name={c.id} className="opacity-40 [filter:brightness(0)]" />
                  <p className="text-sm leading-5 text-muted">???</p>
                  <p className="text-xs leading-4 text-muted">{RARITY_LABEL[c.rarity]}</p>
                </li>
              );
            return (
              <li key={c.id} data-collectible={c.id} data-owned="true">
                <button
                  type="button"
                  className="flex min-h-[112px] w-full flex-col items-center gap-1 rounded-sm bg-transparent p-2 text-center hover:bg-raised"
                  onClick={() => setOpen(c)}
                >
                  <Sprite name={c.id} />
                  <span className="break-words text-sm font-semibold leading-5 hyphens-auto">{c.name}</span>
                  <span className={`text-xs leading-4 ${RARITY_TONE[c.rarity]}`}>{RARITY_LABEL[c.rarity]}</span>
                  {n > 1 && <span className="text-xs leading-4 text-muted">{copies(n)}</span>}
                </button>
              </li>
            );
          })}
          {unknown.map(([id, n]) => (
            <li key={id} className="flex min-h-[112px] flex-col items-center gap-1 p-2 text-center" data-collectible="unknown" data-owned="true">
              <Sprite name="chest6" />
              <p className="text-sm font-semibold leading-5">{UNKNOWN_COLLECTIBLE}</p>
              {n > 1 && <p className="text-xs leading-4 text-muted">{copies(n)}</p>}
            </li>
          ))}
        </ul>
      </div>
      <div aria-hidden className="mt-2 h-2 rounded-[1px] border-b-4 border-wood-dark bg-wood" />
      {owned === 0 && unknown.length === 0 && (
        <p className="mt-3 text-sm leading-5 text-muted">{isMe ? "Feche um dia e abra o baú para ganhar seu primeiro objeto." : "Ainda nenhum objeto."}</p>
      )}
      <CollectionItemDialog item={open} count={open ? (counts[open.id] ?? 0) : 0} isMe={isMe} onClose={() => setOpen(null)} />
    </section>
  );
}
