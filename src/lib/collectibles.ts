// Collectibles won in chests (sprite names in public/lowpoly). The draw itself happens in the
// database (open_chest, migration 0006) so nobody can pick an item; this is the display catalog.
export type Rarity = "comum" | "raro" | "lendario";

// `line` is the inspection card text. `set` is narrative metadata only (no UI, bonus or challenge yet).
// Ids are stored in chest_openings: never rename or reuse one. Weights live in the database (0027).
export const COLLECTIBLES = [
  { id: "plant", name: "Planta", rarity: "comum", line: "Ficou com o melhor lugar da janela." },
  { id: "mug", name: "Caneca", rarity: "comum", line: "Já viu mais madrugadas que você." },
  { id: "duck", name: "Patinho", rarity: "comum", line: "Ouve o código em voz alta sem julgar." },
  { id: "forgottenCoffee", name: "Café esquecido", rarity: "comum", line: "Já esfriou. A prova ainda não chegou.", set: "studyDesk" },
  { id: "survivorPencil", name: "Lápis sobrevivente", rarity: "comum", line: "Ainda dá para mais uma página.", set: "studyDesk" },
  { id: "patchedHeadphones", name: "Fone remendado", rarity: "comum", line: "Concentração por meios alternativos.", set: "studyDesk" },
  { id: "cat", name: "Gato", rarity: "raro", line: "Senta exatamente onde você ia escrever." },
  { id: "lamp", name: "Luminária", rarity: "raro", line: "Testemunha de toda revisão de última hora." },
  { id: "globe", name: "Globo", rarity: "raro", line: "Viaja bastante quando alguém esbarra na mesa." },
  { id: "crookedHourglass", name: "Ampulheta torta", rarity: "raro", line: "O tempo passa. Ela também quase cai.", set: "oddFinds" },
  { id: "suspiciousLoupe", name: "Lupa desconfiada", rarity: "raro", line: "Essa foto merece uma segunda olhada.", set: "judgeChambers" },
  { id: "witnessPigeon", name: "Pombo testemunha", rarity: "raro", line: "Viu tudo. Não entendeu nada.", set: "oddFinds" },
  { id: "goldBook", name: "Livro dourado", rarity: "lendario", line: "Ninguém sabe quem escreveu. Todos dizem que leram." },
  { id: "crown", name: "Coroa", rarity: "lendario", line: "Não dá poder nenhum. Mas fica bem na prateleira." },
  { id: "judgeSlippers", name: "Pantufas do juiz", rarity: "lendario", line: "A autoridade também sente frio.", set: "judgeChambers" },
  { id: "rubberGavel", name: "Martelo de borracha", rarity: "lendario", line: "A decisão é séria. O equipamento, discutível.", set: "judgeChambers" },
  { id: "goldenJudgeBust", name: "Busto dourado do juiz", rarity: "lendario", line: "Encomendado por ele mesmo.", set: "judgeChambers" },
  { id: "magistrateDuck", name: "Patinho magistrado", rarity: "lendario", line: "Promovido sem concurso." },
] as const satisfies readonly { id: string; name: string; rarity: Rarity; line: string; set?: CollectionSet }[];

export type CollectionSet = "studyDesk" | "judgeChambers" | "oddFinds";

/** Last day of the shelf note about the 8 -> 18 expansion (no stored dismissal for a one-off note). */
export const COLLECTION_EXPANSION_NOTE_UNTIL = "2026-11-30";

/** Name shown for an id this version of the app does not know (stored by a newer catalog). */
export const UNKNOWN_COLLECTIBLE = "Objeto da coleção";

export type CollectibleId = (typeof COLLECTIBLES)[number]["id"];

export const RARITY_LABEL: Record<Rarity, string> = { comum: "Comum", raro: "Raro", lendario: "Lendário" };
export const RARITY_TONE: Record<Rarity, string> = { comum: "text-fg", raro: "text-ai", lendario: "text-gold" };

export function collectible(id: string) {
  return COLLECTIBLES.find((c) => c.id === id);
}

export function copies(n: number) {
  return n === 1 ? "1 cópia" : `${n} cópias`;
}

/** Monday of the week of `day` (ISO), the period of the weekly group challenge. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Weekly challenge: every member must complete this many days in the week. */
export const WEEKLY_GOAL_DAYS = 5;
