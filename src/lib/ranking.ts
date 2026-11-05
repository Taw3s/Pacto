// Monthly ranking. Scores are computed on request from check-ins (no stored scores).
import type { ISODate } from "./dates";
import type { Goal } from "./types";

/** Points table — the only place to tune the scoring. */
export const SCORING = {
  completedDay: 20,
  perStudyMinute: 1,
  maxStudyMinutesPerDay: 240,
  perPage: 2,
  maxPagesPerDay: 50,
  perProject: 10, // projects are deliberately cheap so nobody farms them
  perTypingScore: 1, // 1 point per wpm × accuracy of the day's best test (60 wpm at 95% = 57)
  maxTypingPointsPerDay: 240,
};

/** Check-ins made before minutes were recorded count as the goal's minimum. */
export const LEGACY_STUDY_MINUTES = 60;

export interface RankingCheckin {
  user_id: string;
  day: ISODate;
  goal: Goal;
  minutes: number | null;
  pages: number | null;
  annulled: boolean;
}

export interface Score {
  userId: string;
  points: number;
  studyMinutes: number;
  pages: number;
  projects: number;
  completedDays: number;
}

/**
 * `typingBest`: the best typing test score of each person and day ("user|day" -> wpm × accuracy).
 * It scores once a day, and only with a typing proof the tribunal did not annul.
 */
export function scoreMonth(
  userIds: string[],
  checkins: RankingCheckin[],
  completedDays: { user_id: string; day: ISODate }[],
  typingBest: Map<string, number> = new Map(),
): Score[] {
  const scores = new Map<string, Score>(
    userIds.map((id) => [id, { userId: id, points: 0, studyMinutes: 0, pages: 0, projects: 0, completedDays: 0 }]),
  );

  // Study minutes and pages are capped per person and day (a day may hold several sessions).
  const perDay = new Map<string, { minutes: number; pages: number; typing: boolean }>();
  for (const c of checkins) {
    const s = scores.get(c.user_id);
    if (!s || c.annulled) continue;
    if (c.goal === "project") {
      s.projects += 1;
      s.points += SCORING.perProject;
      continue;
    }
    const key = `${c.user_id}|${c.day}`;
    const day = perDay.get(key) ?? { minutes: 0, pages: 0, typing: false };
    perDay.set(key, day);
    if (c.goal === "study") {
      const minutes = Math.min(c.minutes ?? LEGACY_STUDY_MINUTES, SCORING.maxStudyMinutesPerDay - day.minutes);
      day.minutes += minutes;
      s.studyMinutes += minutes;
      s.points += minutes * SCORING.perStudyMinute;
    } else if (c.goal === "typing" && !day.typing) {
      day.typing = true;
      s.points += Math.round(Math.min(typingBest.get(key) ?? 0, SCORING.maxTypingPointsPerDay) * SCORING.perTypingScore);
    } else if (c.goal === "reading") {
      const pages = Math.min(c.pages ?? 0, SCORING.maxPagesPerDay - day.pages);
      day.pages += pages;
      s.pages += pages;
      s.points += pages * SCORING.perPage;
    }
  }

  for (const d of completedDays) {
    const s = scores.get(d.user_id);
    if (!s) continue;
    s.completedDays += 1;
    s.points += SCORING.completedDay;
  }

  return [...scores.values()].sort(
    (a, b) => b.points - a.points || b.completedDays - a.completedDays || b.studyMinutes - a.studyMinutes,
  );
}

/** Competition ranking: ties share a position (1, 1, 3...). */
/**
 * Best typing score per "user|day". A typing proof the tribunal annulled showed the day's best test at
 * that moment, so every test finished up to the condemned proof was judged and does not count after a retake.
 */
export function typingBestByDay(
  tests: { user_id: string; day: ISODate; score: number; finished_at: string }[],
  condemned: { user_id: string; day: ISODate; created_at: string }[],
): Map<string, number> {
  const cut = new Map<string, string>();
  for (const c of condemned) {
    const k = `${c.user_id}|${c.day}`;
    if (!cut.has(k) || c.created_at > cut.get(k)!) cut.set(k, c.created_at);
  }
  const best = new Map<string, number>();
  for (const t of tests) {
    const k = `${t.user_id}|${t.day}`;
    const until = cut.get(k);
    if (until && t.finished_at <= until) continue;
    best.set(k, Math.max(best.get(k) ?? 0, Number(t.score)));
  }
  return best;
}

export function positions(scores: Score[]): number[] {
  const out: number[] = [];
  scores.forEach((s, i) => out.push(i > 0 && s.points === scores[i - 1].points ? out[i - 1] : i + 1));
  return out;
}

/**
 * The podium: positions 1 to 3 (competition ranking, as `positions`) with everyone at each one.
 * Nobody with zero points stands on it. `tied` when a position holds more than one person: the
 * page then shows level shelves instead of steps, since there is no 2nd place in "1, 1, 3".
 */
export function podium(scores: Score[]) {
  const pos = positions(scores);
  const groups: { position: number; userIds: string[]; points: number }[] = [];
  scores.forEach((s, i) => {
    if (pos[i] > 3 || s.points <= 0) return;
    const g = groups.find((x) => x.position === pos[i]);
    if (g) g.userIds.push(s.userId);
    else groups.push({ position: pos[i], userIds: [s.userId], points: s.points });
  });
  return { groups, tied: groups.some((g) => g.userIds.length > 1) };
}
