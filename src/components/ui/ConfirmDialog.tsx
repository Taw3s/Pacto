"use client";

import { Loader } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Sprite, type SpriteName } from "@/components/Sprite";

// Side-by-side buttons from here on (Cancel left, action right); below it they stack, action on top.
const WIDE = "(min-width: 40rem)";

export interface DialogNotice {
  /** Replaces the question when the action can no longer go ahead (target gone, already done). */
  message: string;
  actionLabel: string;
  onAction: () => void;
}

interface Props {
  open: boolean;
  variant: "danger" | "neutral";
  title: string;
  sprite?: SpriteName;
  /** Explanation, summary and notes, in reading order. */
  children: ReactNode;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  cancelLabel?: string;
  busy: boolean;
  busyLabel: string;
  /** Keeps the action off until the caller's own check passes (e.g. a typed confirmation). */
  confirmDisabled?: boolean;
  error?: string;
  notice?: DialogNotice | null;
  onConfirm: () => void;
  /** Escape, backdrop or Cancel. Ignored while busy: the caller's request has its own timeout. */
  onCancel: () => void;
  /** Where focus goes when the button that opened the dialog is gone (e.g. the row was removed). */
  fallbackFocus?: () => HTMLElement | null;
}

/**
 * Confirmation before an action that cannot be undone in the app. The native modal makes the page
 * inert, keeps focus inside and closes on Escape; focus starts on Cancel and goes back to the
 * button that opened it. DOM order follows the visual order in each layout (no CSS reordering).
 */
export function ConfirmDialog(props: Props) {
  const { open, variant, title, sprite, children, confirmLabel, confirmIcon, cancelLabel = "Cancelar", busy, busyLabel, confirmDisabled, error, notice, onConfirm, onCancel } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const fallback = useRef(props.fallbackFocus);
  fallback.current = props.fallbackFocus;
  const isOpen = useRef(open);
  isOpen.current = open;
  const [wide, setWide] = useState(false);
  const id = useId();

  useEffect(() => {
    const media = window.matchMedia(WIDE);
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
      cancel.current?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  // A notice swaps the buttons: put focus on its only action so it is not lost on <body>.
  const noticeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (notice) noticeButton.current?.focus();
  }, [notice]);

  // Unmounted while open (its row was replaced by the result): focus the fallback once it is in the page.
  useEffect(
    () => () => {
      if (isOpen.current) setTimeout(() => fallback.current?.()?.focus());
    },
    [],
  );

  function restoreFocus() {
    const target = opener.current?.isConnected ? opener.current : fallback.current?.();
    target?.focus();
  }

  const confirmClass = variant === "danger" ? "btn-danger" : "btn-primary";
  const spin = <Loader size={16} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />;
  const confirmButton = (
    <button key="confirm" type="button" className={`${confirmClass} w-full sm:w-auto`} disabled={busy || confirmDisabled} onClick={onConfirm}>
      {busy ? spin : confirmIcon}
      {busy ? busyLabel : confirmLabel}
    </button>
  );
  const cancelButton = (
    <button key="cancel" ref={cancel} type="button" className="btn-secondary w-full sm:w-auto" disabled={busy} onClick={onCancel}>
      {cancelLabel}
    </button>
  );

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      aria-busy={busy}
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[480px] overflow-y-auto overscroll-contain rounded-sm border-2 bg-surface p-5 text-fg shadow-[6px_6px_0_var(--color-hard-shadow)] [border-color:var(--color-bevel-light)_var(--color-bevel-dark)_var(--color-bevel-dark)_var(--color-bevel-light)] backdrop:bg-[rgb(20_21_24/0.72)] sm:p-6"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => e.target === dialog.current && !busy && onCancel()}
      onClose={() => {
        // The browser may force a close (a second Escape) while a request is pending: stay open
        // until the caller decides; its request times out, so the controls always come back.
        if (isOpen.current) dialog.current?.showModal();
        else restoreFocus();
      }}
    >
      <div className="flex items-center gap-3">
        {sprite && <Sprite name={sprite} />}
        <h2 id={`${id}-title`} className="pixel min-w-0 flex-1 break-words text-2xl leading-7">
          {title}
        </h2>
      </div>
      <div id={`${id}-body`} className="mt-4 space-y-3 break-words">
        {notice ? <p>{notice.message}</p> : children}
      </div>
      {error && !notice && (
        <p role="alert" className="mt-4 rounded-sm border-2 border-fail bg-fail-bg p-3 text-fail">
          {error}
        </p>
      )}
      <p role="status" className="sr-only">
        {busy ? busyLabel : ""}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        {notice ? (
          <button ref={noticeButton} type="button" className="btn-secondary w-full sm:w-auto" onClick={notice.onAction}>
            {notice.actionLabel}
          </button>
        ) : wide ? (
          [cancelButton, confirmButton]
        ) : (
          [confirmButton, cancelButton]
        )}
      </div>
    </dialog>
  );
}
