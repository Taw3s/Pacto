"use client";

import { Loader } from "lucide-react";
import Link, { useLinkStatus } from "next/link";

/** "Abrindo…" with a stepped spinner, only on the link that was pressed, while the next page loads. */
function Label({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <>
      <Loader size={16} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />
      <span role="status">Abrindo…</span>
    </>
  ) : (
    <>{children}</>
  );
}

/** A plain link styled as a button; the page around it stays readable while it loads. */
export function NavButton({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={className}>
      <Label>{children}</Label>
    </Link>
  );
}
