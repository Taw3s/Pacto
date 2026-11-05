"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Asks the AI judge for proofs it has not reviewed yet (a review that failed, or one still
 * running when the page loaded) and refreshes once a verdict exists. A proof whose review is
 * already running answers "busy": it is asked again every 5 seconds, for up to a minute.
 * Renders nothing.
 */
export function PendingReviews({ ids }: { ids: string[] }) {
  const router = useRouter();
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = (checkinId: string) =>
      fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkinId }) })
        .then(async (r) => ((await r.json().catch(() => ({}))) as { status?: string }).status)
        .catch(() => undefined);
    async function round(list: string[], n: number) {
      const statuses = await Promise.all(list.map(ask));
      if (cancelled) return;
      if (statuses.some((s) => s === "reviewed" || s === "exists")) return router.refresh();
      const busy = list.filter((_, i) => statuses[i] === "busy");
      if (busy.length && n < 12) timer = setTimeout(() => round(busy, n + 1), 5000);
    }
    round(key.split(","), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, router]);
  return null;
}
