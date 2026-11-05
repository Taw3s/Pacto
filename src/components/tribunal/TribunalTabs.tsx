"use client";

import { useState } from "react";

/** "Provas" and "Votos" tabs of the tribunal (keyboard: arrows switch tabs). */
export function TribunalTabs({ evidence, votes, voteCount }: { evidence: React.ReactNode; votes: React.ReactNode; voteCount: number }) {
  const [tab, setTab] = useState<"evidence" | "votes">("evidence");
  const tabs = [
    { id: "evidence" as const, label: "Provas" },
    { id: "votes" as const, label: `Votos (${voteCount})` },
  ];
  return (
    <section className="mt-6">
      <div
        role="tablist"
        aria-label="Tribunal"
        className="mb-4 grid grid-cols-2 gap-1 rounded-sm border-2 border-bevel-dark bg-bg p-1"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") setTab((t) => (t === "evidence" ? "votes" : "evidence"));
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={`pixel min-h-11 rounded-sm text-base uppercase ${tab === t.id ? "bg-raised text-accent shadow-[2px_2px_0_var(--color-hard-shadow)]" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-evidence" aria-labelledby="tab-evidence" hidden={tab !== "evidence"}>
        {evidence}
      </div>
      <div role="tabpanel" id="panel-votes" aria-labelledby="tab-votes" hidden={tab !== "votes"}>
        {votes}
      </div>
    </section>
  );
}
