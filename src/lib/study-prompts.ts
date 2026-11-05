// The question of the day for the study summary: answering it takes having studied, a free summary
// ("estudei funções") does not. Ids are stored in checkins.study_prompt: never rename or reuse one.
export interface StudyPrompt {
  id: string;
  text: string;
}

export const STUDY_PROMPTS: StudyPrompt[] = [
  { id: "explain", text: "Explique o assunto principal de hoje como se fosse para um amigo que nunca viu." },
  { id: "new", text: "O que você aprendeu hoje que não sabia ontem?" },
  { id: "hard", text: "Qual foi a parte mais difícil e como você lidou com ela?" },
  { id: "example", text: "Dê um exemplo concreto do que você estudou: um trecho de código, uma conta ou uma frase." },
  { id: "doubt", text: "O que ainda ficou confuso? Escreva a sua dúvida." },
  { id: "mistake", text: "Que erro você cometeu hoje e o que ele te ensinou?" },
  { id: "terms", text: "Cite três termos que apareceram no estudo e explique um deles." },
  { id: "use", text: "Onde você usaria o que estudou hoje, fora do estudo?" },
  { id: "next", text: "Se fosse continuar amanhã, qual seria o próximo passo e por quê?" },
  { id: "compare", text: "Compare o que estudou hoje com algo que você já sabia." },
];

const BY_ID = new Map(STUDY_PROMPTS.map((p) => [p.id, p]));

export function studyPrompt(id: string | null | undefined): StudyPrompt | null {
  return (id && BY_ID.get(id)) || null;
}

/** Same person, same day, same question: reloading the page does not draw an easier one. */
export function promptOfDay(userId: string, day: string): StudyPrompt {
  let h = 2166136261;
  for (const c of `${userId}:${day}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return STUDY_PROMPTS[h % STUDY_PROMPTS.length];
}
