import type { ISODate } from "./dates";
import type { DebtItem } from "./debt-items";

export type DailyGoal = "study" | "typing" | "reading";
export type Goal = DailyGoal | "project";

interface GoalMeta {
  id: Goal;
  label: string;
  hint: string;
}

/** The three daily goals; a day is complete only with all of them. */
export const GOALS: (GoalMeta & { id: DailyGoal })[] = [
  { id: "study", label: "Estudo", hint: "Mínimo 60 min" },
  { id: "typing", label: "Digitação", hint: "5 min" },
  { id: "reading", label: "Leitura", hint: "15 min" },
];

/** Optional, at most one per day; worth few ranking points. */
export const PROJECT: GoalMeta = { id: "project", label: "Projeto", hint: "Opcional · 1 por dia" };

export function goalMeta(goal: Goal): GoalMeta {
  return goal === "project" ? PROJECT : GOALS.find((g) => g.id === goal)!;
}

export const MIN_STUDY_MINUTES = 60;
export const MIN_EXTRA_MINUTES = 10;
export const MAX_EXTRA_SESSIONS = 5;
export const MAX_PHOTOS = 4;

export function checkinNumbers(item: { goal: Goal; minutes: number | null; pages: number | null; title: string | null }): string | null {
  if (item.goal === "study" && item.minutes) return `${item.minutes} min`;
  if (item.goal === "reading" && item.pages) return `${item.pages} ${item.pages === 1 ? "página" : "páginas"}`;
  if (item.goal === "project" && item.title) return item.title;
  return null;
}

export const MIN_SUMMARY = 40;

export interface Member {
  user_id: string;
  group_id: string;
  display_name: string;
  avatar_path: string | null;
  joined_on: ISODate;
  created_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  group_id: string;
  day: ISODate;
  goal: Goal;
  photo_path: string;
  summary: string | null;
  /** The question of the day the study summary answers (src/lib/study-prompts.ts). */
  study_prompt: string | null;
  minutes: number | null;
  pages: number | null;
  title: string | null;
  /** Required repository link for new optional project proofs. */
  project_url: string | null;
  /** An extra study session (adds minutes; never counts as the study goal itself). */
  extra: boolean;
  /** The annulled proof this one retakes (same goal, same day). */
  retake_of: string | null;
  /** Up to 3 more photos besides photo_path (4 in total). */
  extra_photos: string[];
  /** When the phone says the photos were taken (oldest); only a hint. */
  photo_taken_at: string | null;
  /** Typing: the in-app test this proof comes from. */
  typing_test_id: string | null;
  created_at: string;
}

export interface CheckinAttachment {
  id: string;
  checkin_id: string;
  group_id: string;
  user_id: string;
  kind: "study_pdf" | "project_zip";
  storage_path: string;
  display_name: string;
  size_bytes: number;
  created_at: string;
}

export type DisputeStatus = "open" | "upheld" | "rejected";

export interface Dispute {
  id: string;
  checkin_id: string;
  /** null when the AI judge opened the tribunal (by_ai). */
  author_id: string | null;
  by_ai: boolean;
  reason: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface DisputeResult {
  dispute_id: string;
  checkin_id: string;
  yes: number;
  no: number;
  eligible: number;
  majority: number;
  closes_at: string;
  status: DisputeStatus;
}

export interface DisputeVote {
  dispute_id: string;
  /** Null once the voter left the group: the vote still counts. */
  voter_id: string | null;
  upheld: boolean;
  /** Why guilty / innocent. Null only for votes cast before reasons existed. */
  reason: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  debtor_id: string;
  day: ISODate;
  item: DebtItem;
  received_by: string | null;
  received_name?: string | null;
  paid_at: string;
}


export interface CheckinReview {
  checkin_id: string;
  verdict: import("./ai-review").Verdict;
  seen: string;
  detected: number | null;
  model: string;
  answer_check: import("./ai-review").AnswerCheck | null;
}
