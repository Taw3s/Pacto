import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Privacy policy, terms and the support page: public pages, readable without an account (linked from the login and the presentation). */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="gutter mx-auto max-w-[680px] pb-16 pt-[calc(16px+env(safe-area-inset-top))]">
      <Link href="/login" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft size={18} aria-hidden /> Pacto
      </Link>
      <article className="legal mt-2">{children}</article>
    </main>
  );
}
