"use client";

/* eslint-disable @next/next/no-img-element -- signed URLs of the proof, shown as is (no pixel filter) */
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  /** Every photo of the proof, in order. */
  photos: string[];
  /** Which photo the trigger opens. */
  start?: number;
  alt: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Proof photos that open enlarged in the page (native modal dialog: Esc closes it, focus stays
 * inside while open and returns to the thumbnail afterwards). With several photos, arrows and the
 * keyboard's left/right keys move between them.
 */
export function PhotoViewer({ photos, start = 0, alt, label, className = "", children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [i, setI] = useState(start);
  const many = photos.length > 1;
  const go = (d: number) => setI((n) => (n + d + photos.length) % photos.length);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={className}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={() => {
          setI(start);
          dialog.current?.showModal();
        }}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-label={alt}
        className="m-auto max-h-[100dvh] max-w-[100vw] bg-transparent p-3 text-fg backdrop:bg-black/85"
        onClose={() => trigger.current?.focus()}
        // a click on the dark backdrop (outside the content) closes it too
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <div className="flex flex-col items-end gap-2">
          <div className="flex w-full items-center justify-between gap-2">
            <p className="pixel tabular text-base" aria-live="polite">
              {many ? `Foto ${i + 1} de ${photos.length}` : ""}
            </p>
            <button type="button" autoFocus className="btn-secondary min-h-11" onClick={() => dialog.current?.close()}>
              <X size={18} aria-hidden /> Fechar
            </button>
          </div>
          <img src={photos[i]} alt={many ? `${alt} (foto ${i + 1} de ${photos.length})` : alt} className="max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-1.5rem)] rounded-sm object-contain" />
          {many && (
            <div className="flex w-full justify-center gap-3">
              <button type="button" className="btn-secondary min-h-11" onClick={() => go(-1)} aria-label="Foto anterior">
                <ChevronLeft size={20} aria-hidden />
              </button>
              <button type="button" className="btn-secondary min-h-11" onClick={() => go(1)} aria-label="Próxima foto">
                <ChevronRight size={20} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
