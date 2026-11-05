"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Returns to where the user came from (keeping tab and scroll); falls back to a fixed page on deep links. */
export function BackButton({ fallback, label = "Voltar" }: { fallback: string; label?: string }) {
  const router = useRouter();
  function back() {
    const sameOrigin = document.referrer.startsWith(window.location.origin);
    if (sameOrigin && window.history.length > 1) router.back();
    else router.push(fallback);
  }
  return (
    <button onClick={back} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-2 text-sm font-medium text-muted hover:text-fg">
      <ChevronLeft size={20} aria-hidden />
      {label}
    </button>
  );
}
