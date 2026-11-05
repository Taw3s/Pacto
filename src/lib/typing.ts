// The in-app typing test: words to type and how a run is counted. The server times the test and
// turns the counts into wpm/accuracy (finish_typing_test), so this only measures what was typed.

/** Common Portuguese words, short and long, a few with accents. */
const WORDS = (
  "que de não para com uma por mais como mas foi ao ele das tem seu sua ser quando muito nos já está também só pelo pela " +
  "até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu " +
  "às minha têm numa pelos elas havia seja qual será nós tenho lhe deles essas esses pelas este fosse dele tu te vocês vos " +
  "casa tempo vida dia ano mundo trabalho estudo livro página leitura escola amigo grupo meta prova tribunal semana mês " +
  "café água pão janela porta mesa cadeira teclado tela celular computador projeto ideia caminho cidade rua noite manhã " +
  "tarde hoje amanhã ontem sempre nunca agora antes cedo tarde rápido devagar forte leve claro escuro novo velho grande " +
  "pequeno bonito simples difícil fácil verdade palavra frase texto história número ponto hora minuto segundo exemplo " +
  "pessoa família começo final lugar coisa parte forma maneira problema resposta pergunta jogo música filme cinema praia " +
  "campo montanha rio mar sol lua estrela chuva vento fogo terra árvore flor fruta animal cachorro gato pássaro peixe"
).split(" ");

/** Common English words, for the test in English. */
const WORDS_EN = (
  "the of and to in is you that it he was for on are as with his they at be this have from or one had by word but not " +
  "what all were we when your can said there use each which she do how their if will up other about out many then them " +
  "these so some her would make like him into time has look two more write go see number way could people my than first " +
  "water been call who oil its now find long down day did get come made may part over new sound take only little work " +
  "know place year live me back give most very after thing our just name good sentence man think say great where help " +
  "through much before line right too mean old any same tell boy follow came want show also around form three small set " +
  "put end does another well large must big even such because turn here why ask went men read need land different home " +
  "us move try kind hand picture again change off play spell air away animal house point page letter mother answer found " +
  "study still learn should world high every near add food between own below country plant last school father keep tree " +
  "never start city earth eye light thought head under story saw left few while along might close something seem next " +
  "hard open example begin life always those both paper together got group often run important until children side feet"
).split(" ");

export type TypingLang = "pt" | "en";
export const LANG_LABEL = { pt: "Português", en: "English" } as const;

/** `n` random words (the test never runs out). */
export function makeWords(n = 120, random = Math.random, lang: TypingLang = "pt"): string[] {
  const list = lang === "en" ? WORDS_EN : WORDS;
  return Array.from({ length: n }, () => list[Math.floor(random() * list.length)]);
}

/**
 * Characters typed and characters right. A word counts as right only when typed exactly; its
 * space counts too (the usual wpm rule: 5 characters = 1 word). The word in progress counts
 * up to where it matches.
 */
export function countRun(target: string[], committed: string[], current: string) {
  let correct = 0;
  let typed = 0;
  committed.forEach((w, i) => {
    typed += w.length + 1;
    if (w === target[i]) correct += w.length + 1;
  });
  typed += current.length;
  const next = target[committed.length] ?? "";
  if (current && next.startsWith(current)) correct += current.length;
  return { correct, typed };
}

/** Phone (touch only) or computer. Results of the two are ranked apart. */
export function deviceKind(): "pc" | "mobile" {
  if (typeof window === "undefined") return "pc";
  return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches ? "mobile" : "pc";
}

export const DEVICE_LABEL = { pc: "PC", mobile: "Celular" } as const;

/** "72 WPM · 96%", plus "· 5 min" for a 5-minute test. */
export function typingLabel(t: { wpm: number; accuracy: number; minutes?: number | null }) {
  return `${Number(t.wpm).toFixed(0)} WPM · ${Math.round(Number(t.accuracy) * 100)}%${Number(t.minutes) === 5 ? " · 5 min" : ""}`;
}
