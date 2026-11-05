import Link from "next/link";
import { Sprite } from "./Sprite";

/** Entry screens (login, join): a small low-poly "title screen" above the form, never in its way. */
export function AuthShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <main className="gutter mx-auto flex min-h-dvh max-w-[400px] flex-col pb-10 pt-[calc(24px+env(safe-area-inset-top))]">
      <div className="mb-6">
        <div aria-hidden className="relative mb-4 h-[136px] overflow-hidden rounded-sm border-2 border-bevel-dark bg-[#303747] shadow-[4px_4px_0_var(--color-hard-shadow)]">
          <div className="absolute inset-x-0 bottom-0 h-3 border-t-2 border-wood bg-wood-dark" />
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-1">
            <Sprite name="notebook" />
            <Sprite name="computer" scale={2} />
            <Sprite name="openBook" />
          </div>
        </div>
        <p className="pixel text-[40px] font-bold uppercase leading-[44px] text-accent [text-shadow:3px_3px_0_var(--color-hard-shadow)]">Pacto</p>
        <p className="mt-1 text-sm text-muted">Seu compromisso com o grupo</p>
        <h1 className="pixel mt-5 text-xl uppercase leading-6">{subtitle}</h1>
      </div>
      {children}
      <p className="mt-auto pt-8 text-center text-sm text-muted">
        <Link href="/privacidade" className="inline-flex min-h-11 items-center underline">
          Privacidade
        </Link>
        <span aria-hidden> · </span>
        <Link href="/termos" className="inline-flex min-h-11 items-center underline">
          Termos de uso
        </Link>
      </p>
    </main>
  );
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-2" role="status">
      <h2 className="pixel flex items-center gap-2 text-xl uppercase leading-6">
        <Sprite name="memoryCard" /> {title}
      </h2>
      <p className="text-muted">{children}</p>
    </div>
  );
}
