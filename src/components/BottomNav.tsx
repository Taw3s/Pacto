"use client";

import { CircleCheck, Loader, ReceiptText, UserRound, Users, type LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GROUP_TAB_KEY } from "./GroupTabs";
import { GuideButton } from "./JudgeGuide";

interface Item {
  label: string;
  icon: LucideIcon;
  href: string;
  match: string[];
}

const ITEMS: Item[] = [
  { label: "Hoje", icon: CircleCheck, href: "/hoje", match: ["/hoje"] },
  { label: "Grupo", icon: Users, href: "/feed", match: ["/feed", "/ranking", "/checkin"] },
  { label: "Dívidas", icon: ReceiptText, href: "/dividas", match: ["/dividas"] },
  { label: "Perfil", icon: UserRound, href: "/historico", match: ["/historico", "/config"] },
];

/** Instant feedback on tap: the icon spins while the next page renders on the server. */
function TabIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader size={22} strokeWidth={2} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] text-accent motion-reduce:animate-none" />
  ) : (
    <Icon size={22} strokeWidth={2} aria-hidden />
  );
}

/** `profileHref` points straight at the user's own history: no redirect hop when switching tabs. */
export function BottomNav({ profileHref }: { profileHref: string }) {
  const path = usePathname();
  // "Grupo" reopens the sub-tab (Feed or Ranking) used last.
  const [groupHref, setGroupHref] = useState("/feed");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(GROUP_TAB_KEY);
      if (saved === "/feed" || saved === "/ranking") setGroupHref(saved);
    } catch {}
  }, [path]);

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-bevel-light bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_0_var(--color-hard-shadow)] desk:inset-y-0 desk:right-auto desk:w-60 desk:border-r-2 desk:border-t-0 desk:overflow-y-auto desk:pb-6 desk:shadow-[3px_0_0_var(--color-hard-shadow)]"
    >
      {/* Desktop: the nav becomes a side bar with the brand on top. */}
      <div className="hidden px-6 pb-6 pt-8 desk:block">
        <p className="pixel text-[32px] font-bold uppercase leading-9 text-accent [text-shadow:3px_3px_0_var(--color-hard-shadow)]">Pacto</p>
        <p className="mt-1 text-sm text-muted">Seu compromisso com o grupo</p>
      </div>
      <ul className="mx-auto grid h-16 max-w-[560px] grid-cols-4 desk:mx-3 desk:h-auto desk:max-w-none desk:grid-cols-1 desk:gap-1">
        {ITEMS.map((item) => {
          const active = item.match.some((m) => path === m || path.startsWith(`${m}/`));
          const href = item.label === "Grupo" ? groupHref : item.label === "Perfil" ? profileHref : item.href;
          return (
            <li key={item.label} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`pixel mx-1 my-1 flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-sm border-2 text-sm uppercase leading-4 transition-colors duration-150 desk:my-0 desk:min-h-12 desk:flex-row desk:justify-start desk:gap-3 desk:px-4 desk:text-lg ${
                  active ? "border-bevel-dark border-b-bevel-light border-r-bevel-light bg-bg text-accent" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                <TabIcon icon={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Desktop: the guide is an action after the destinations, not a fifth tab. */}
      <div className="mx-3 mt-6 hidden border-t-2 border-divider pt-4 desk:block">
        <GuideButton place="nav" />
      </div>
    </nav>
  );
}
