import Link from "next/link";
import { NavButton } from "@/components/landing/NavButton";
import { Sprite, type SpriteName } from "@/components/Sprite";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_URL } from "@/lib/support";

export const dynamic = "force-dynamic";

/** Who is looking: decides the actions (one person, one group: a member is not offered a new one). */
async function visitor(): Promise<"guest" | "member" | "no-group"> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) return "guest";
  const { data: member } = await supabase.from("members").select("user_id").eq("user_id", me).maybeSingle();
  return member ? "member" : "no-group";
}

const GOALS: { sprite: SpriteName; title: string; text: string }[] = [
  { sprite: "notebook", title: "Estudo", text: "Envie uma foto, os minutos estudados e um resumo." },
  { sprite: "keyboard", title: "Digitação", text: "Faça o teste aqui no app. O resultado vira sua prova." },
  { sprite: "openBook", title: "Leitura", text: "Envie uma foto e registre as páginas lidas." },
];

/**
 * Public presentation at "/": what the challenge is before any sign-up. Static text, real sprites,
 * no numbers about groups or people (nothing here comes from the database except who is looking).
 */
export default async function Home() {
  const who = await visitor();
  // Signed in without a group: the join page skips the sign-up and goes straight to the code/name step.
  const createHref = who === "no-group" ? "/join?step=code&criar=1" : "/join?criar=1";
  const codeHref = who === "no-group" ? "/join?step=code" : "/join";
  const primary = "btn-primary w-full sm:w-auto";
  const link = "inline-flex min-h-12 items-center font-semibold text-accent underline underline-offset-4";

  const actions =
    who === "member" ? (
      <NavButton href="/hoje" className={primary}>
        Ir para meu desafio
      </NavButton>
    ) : (
      <>
        <NavButton href={createHref} className={primary}>
          Criar um desafio
        </NavButton>
        <Link href={codeHref} className={link}>
          Tenho um código de convite
        </Link>
      </>
    );

  return (
    <div className="mx-auto max-w-[1120px] gutter pb-[calc(32px+env(safe-area-inset-bottom))] desk:px-0">
      <header className="flex min-h-14 items-center justify-between gap-3 pt-[env(safe-area-inset-top)] sm:min-h-18">
        <span className="pixel text-[28px] font-bold uppercase leading-8 text-accent [text-shadow:2px_2px_0_var(--color-hard-shadow)]">Pacto</span>
        {who === "guest" && (
          <Link href="/login" className="inline-flex min-h-12 items-center px-1 font-semibold text-fg underline underline-offset-4">
            Já tenho conta
          </Link>
        )}
      </header>

      <main>
        {/* A. Opening: promise, the three activities, deadline and consequence, then the actions. */}
        <section aria-labelledby="hero" className="mt-4 min-[72rem]:mt-10 min-[72rem]:grid min-[72rem]:grid-cols-[minmax(0,600px)_minmax(0,440px)] min-[72rem]:items-center min-[72rem]:gap-16">
          <div>
            <p className="paper-label">Um desafio entre amigos</p>
            <h1 id="hero" className="pixel mt-3 max-w-[600px] break-words text-[36px] font-bold leading-10 sm:text-[56px] sm:leading-[60px]">
              Combinou com o grupo? Cumpra o pacto.
            </h1>
            <p className="mt-4 max-w-[520px]">Estude, pratique digitação e leia todos os dias. Registre suas provas até 23:59, no horário de São Paulo.</p>
            <ul className="mt-5 grid max-w-[520px] grid-cols-3 gap-2" aria-label="As três metas do dia">
              {GOALS.map((g) => (
                <li key={g.title} className="card flex flex-col items-center gap-1 !p-2 text-center text-sm font-semibold">
                  <Sprite name={g.sprite} />
                  {g.title}
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-[520px]">Não cumpriu? Fica devendo os itens combinados pelo grupo. O Pacto registra a dívida; não cobra dinheiro.</p>
            <div className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-6">{actions}</div>
          </div>
          <JudgeScene />
        </section>

        {/* B. A day. */}
        <section aria-labelledby="dia" className="mt-14">
          <h2 id="dia" className="pixel text-[28px] leading-8">
            Três metas. Um combinado.
          </h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-3 md:gap-5">
            {GOALS.map((g) => (
              <li key={g.title} className="card flex items-start gap-3">
                <Sprite name={g.sprite} />
                <div className="min-w-0">
                  <h3 className="pixel text-xl leading-6">{g.title}</h3>
                  <p className="mt-1">{g.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-muted">O prazo diário é 23:59, no horário de São Paulo. Você tem um dia de folga por semana.</p>
        </section>

        {/* C. Debt and court. */}
        <section aria-label="Dívida e tribunal" className="mt-14 grid gap-3 md:grid-cols-2 md:gap-6">
          <div className="card">
            <h2 className="pixel text-2xl leading-7">O combinado tem consequência.</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-end">
                <Sprite name="sodaCan" />
                <Sprite name="coxinha" />
              </span>
              <span className="paper-label">Exemplo de cardápio</span>
            </div>
            <p className="mt-3">O grupo escolhe os itens devidos por dia não cumprido. Quem recebe registra o recebimento no app.</p>
          </div>
          <div className="card">
            <h2 className="pixel text-2xl leading-7">O juiz confere. O grupo decide.</h2>
            <div className="mt-3">
              <Sprite name="judgeBench" />
            </div>
            <p className="mt-3">A IA confere as fotos e pode abrir uma contestação. A decisão do tribunal é feita pelo voto do grupo.</p>
          </div>
        </section>

        {/* D. Motivation and closing. */}
        <section aria-labelledby="progresso" className="mt-14 flex items-start gap-3">
          <Sprite name="chest1" />
          <div className="min-w-0">
            <h2 id="progresso" className="pixel text-2xl leading-7">
              Seu progresso também conta.
            </h2>
            <p className="mt-2 max-w-[600px]">Acompanhe sua sequência, dispute o ranking do mês e descubra os itens dos baús.</p>
          </div>
        </section>

        <section aria-labelledby="fechamento" className="card mt-14 text-center">
          <h2 id="fechamento" className="pixel text-[28px] leading-8">
            Chame seus amigos. Façam o primeiro pacto.
          </h2>
          <div className="mt-5 flex flex-col items-center gap-2">
            {who === "member" ? (
              <NavButton href="/hoje" className={primary}>
                Ir para meu desafio
              </NavButton>
            ) : (
              <NavButton href={createHref} className={primary}>
                Criar um desafio
              </NavButton>
            )}
          </div>
          <p className="mx-auto mt-4 max-w-[520px] text-sm text-muted">Funciona no navegador. Você também pode instalar o Pacto na tela inicial do celular.</p>
        </section>
      </main>

      <footer className="mt-12 border-t-2 border-divider pt-4 text-sm text-muted">
        {who !== "member" && (
          <p className="flex flex-wrap gap-x-6">
            {who === "guest" && (
              <Link href="/login" className="inline-flex min-h-12 items-center underline">
                Já tenho conta
              </Link>
            )}
            <Link href={codeHref} className="inline-flex min-h-12 items-center underline">
              Tenho um código de convite
            </Link>
          </p>
        )}
        <p>
          <Link href="/privacidade" className="inline-flex min-h-12 items-center underline">
            Privacidade
          </Link>
          <span aria-hidden> · </span>
          <Link href="/termos" className="inline-flex min-h-12 items-center underline">
            Termos de uso
          </Link>
          {SUPPORT_URL && (
            <>
              <span aria-hidden> · </span>
              <Link href="/apoiar" className="inline-flex min-h-12 items-center underline">
                Apoiar o projeto
              </Link>
            </>
          )}
        </p>
      </footer>
    </div>
  );
}

/** A wooden shelf on the wall, its objects standing on it (with the hard shadow of the panels). */
function Shelf({ items, scale = 1, className }: { items: SpriteName[]; scale?: 1 | 2; className: string }) {
  return (
    <div className={`absolute flex flex-col items-center ${className}`}>
      <div className="flex items-end gap-1 px-1">
        {items.map((n) => (
          <Sprite key={n} name={n} scale={scale} />
        ))}
      </div>
      <div className="-mt-2 h-3 w-full rounded-[1px] border-b-4 border-wood-dark bg-wood shadow-[3px_3px_0_var(--color-hard-shadow)]" />
    </div>
  );
}

const WALL = "bg-[repeating-linear-gradient(90deg,#4a2a12_0_2px,#5e3518_2px_22px,#55301a_22px_24px)]";
const FLOOR = "bg-[repeating-conic-gradient(#2e3238_0_25%,#33373e_0_50%)] bg-[length:24px_24px]";

/**
 * The courtroom of the tribunal screen, in miniature: wood-panelled wall, the judge standing behind
 * the bench (his lower half hidden by it) with the proof folder on top, the three goal objects on
 * shelves, a rail and a tiled floor. Phone: judge 96 px, folder 48, at most 144 px tall. Wide:
 * judge 144, folder 96, objects 48. Whole-number scales only; the caption carries the meaning.
 */
function JudgeScene() {
  return (
    <figure className="mt-8 max-w-[440px] min-[72rem]:mt-0">
      <div aria-hidden className="card relative overflow-hidden !p-0">
        {/* phone */}
        <div className="min-[72rem]:hidden">
          <div className={`relative h-[132px] ${WALL}`}>
            <Shelf items={["notebook", "keyboard"]} className="left-2 top-6 min-[360px]:left-3" />
            <Shelf items={["openBook"]} className="right-2 top-6 min-[360px]:right-5" />
            <div className="absolute bottom-0 left-1/2 h-[96px] w-[96px] -translate-x-1/2">
              <Sprite name="judge-idle1" scale={2} className="absolute -top-3 left-0" />
              <Sprite name="benchFront" scale={2} className="absolute bottom-0 left-0" />
              <Sprite name="evidenceFolder" className="absolute -right-4 bottom-[26px]" />
            </div>
          </div>
          <div className="h-3 border-t-2 border-wood bg-wood-dark" />
        </div>
        {/* wide */}
        <div className="hidden min-[72rem]:block">
          <div className={`relative h-[228px] ${WALL}`}>
            <Shelf items={["notebook", "keyboard"]} className="left-4 top-10" />
            <Shelf items={["openBook"]} className="right-6 top-10" />
            <div className="absolute bottom-0 left-1/2 h-[144px] w-[144px] -translate-x-1/2">
              <Sprite name="judge-idle1" scale={3} className="absolute -top-8 left-0" />
              <Sprite name="benchFront" scale={3} className="absolute bottom-0 left-0" />
              <Sprite name="evidenceFolder" scale={2} className="absolute -right-5 bottom-[36px]" />
            </div>
          </div>
          <div className="h-3 border-t-2 border-wood bg-wood-dark" />
          <div className={`h-12 ${FLOOR}`} />
        </div>
      </div>
      <figcaption className="mt-2 text-sm text-muted">As provas ficam na mesa.</figcaption>
    </figure>
  );
}
