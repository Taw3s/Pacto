"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { copies, RARITY_LABEL, RARITY_TONE, type COLLECTIBLES } from "@/lib/collectibles";
import { Sprite } from "./Sprite";

type Item = (typeof COLLECTIBLES)[number];

/**
 * Read-only card of an owned object: name, sprite at 144 px, rarity, its line and how many copies.
 * Not a confirmation (ConfirmDialog stays for actions). The native modal makes the page inert, keeps
 * focus inside and closes on Escape; focus starts on Close and goes back to the object that opened it.
 */
export function CollectionItemDialog({ item, count, isMe, onClose }: { item: Item | null; count: number; isMe: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const id = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (item && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
      close.current?.focus();
    } else if (!item && d.open) {
      d.close();
    }
  }, [item]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      data-testid="collection-item-dialog"
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[480px] overflow-y-auto overscroll-contain rounded-sm border-2 bg-surface p-5 text-fg shadow-[6px_6px_0_var(--color-hard-shadow)] [border-color:var(--color-bevel-light)_var(--color-bevel-dark)_var(--color-bevel-dark)_var(--color-bevel-light)] backdrop:bg-[rgb(20_21_24/0.72)] sm:p-6"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      onClose={() => opener.current?.isConnected && opener.current.focus()}
    >
      {item && (
        <>
          <div className="flex items-start gap-3">
            <h2 id={`${id}-title`} className="pixel min-w-0 flex-1 break-words pt-2 text-2xl leading-7 hyphens-auto">
              {item.name}
            </h2>
            <button ref={close} type="button" className="btn-secondary !min-h-11 !min-w-11 shrink-0 !p-0" aria-label="Fechar" onClick={onClose}>
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="my-4 flex justify-center">
            <Sprite name={item.id} scale={3} />
          </div>
          <p className={`text-sm font-semibold leading-5 ${RARITY_TONE[item.rarity]}`}>{RARITY_LABEL[item.rarity]}</p>
          <p className="mt-2 break-words text-base leading-6">{item.line}</p>
          <p className="mt-3 text-sm leading-5 text-muted" data-testid="collection-item-copies">
            {isMe ? `Você tem ${copies(count)}.` : `${copies(count)} na coleção.`}
          </p>
          <button type="button" className="btn-secondary mt-6 min-h-12 w-full" onClick={onClose}>
            Fechar
          </button>
        </>
      )}
    </dialog>
  );
}
