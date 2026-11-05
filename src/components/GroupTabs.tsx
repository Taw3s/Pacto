"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const GROUP_TAB_KEY = "pacto:group-tab";

const TABS = [
  { href: "/feed", label: "Feed" },
  { href: "/ranking", label: "Ranking" },
];

/** Segmented control inside "Grupo". Remembers the choice for the bottom nav. */
export function GroupTabs() {
  const path = usePathname();
  useEffect(() => {
    try {
      sessionStorage.setItem(GROUP_TAB_KEY, path.startsWith("/ranking") ? "/ranking" : "/feed");
    } catch {}
  }, [path]);
  return (
    <div role="tablist" aria-label="Grupo" className="mb-6 grid grid-cols-2 gap-1 rounded-sm bg-surface p-1">
      {TABS.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            className={`flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-150 ${
              active ? "bg-raised text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
