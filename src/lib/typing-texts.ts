// Texts for the typing test's "Texto" mode: short explanations about programming, in prose (no
// code symbols), so the test is also a reading. Each person keeps their place in every text
// (typing_progress). The texts themselves live in typing-texts-pt.ts and typing-texts-en.ts and are
// loaded only when the test opens, so the rest of the app does not carry them.
import type { TypingLang } from "./typing";

export interface TypingText {
  id: string;
  lang: TypingLang;
  category: string;
  title: string;
  text: string;
}

export const TYPING_CATEGORIES = ["Fundamentos", "SQL e dados", "Python", "JavaScript", "TypeScript", "Java", "Web"] as const;

/** The texts of one language (a separate chunk per language). */
export async function loadTypingTexts(lang: TypingLang): Promise<TypingText[]> {
  const mod = lang === "en" ? await import("./typing-texts-en") : await import("./typing-texts-pt");
  return mod.TEXTS;
}

export function textWords(t: TypingText) {
  return t.text.split(/\s+/).filter(Boolean);
}

/** The words of a test that starts `start` words into the text; past the end it starts over. */
export function wordsFrom(t: TypingText, start: number, n = 160) {
  const all = textWords(t);
  const from = start % all.length;
  const out: string[] = [];
  for (let i = 0; out.length < n; i++) out.push(all[(from + i) % all.length]);
  return { words: out, wrapsAt: all.length - from };
}

/**
 * Where the person stands in a text after typing `typed` words from `start`. A long test can go
 * around the text more than once: `laps` counts how many times it reached the end.
 */
export function progressAfter(t: TypingText, start: number, typed: number) {
  const total = textWords(t).length;
  const at = (start % total) + typed;
  return { words: at % total, laps: Math.floor(at / total), total };
}
