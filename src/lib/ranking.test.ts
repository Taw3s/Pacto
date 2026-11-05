import { describe, expect, it } from "vitest";
import { podium, positions, scoreMonth, SCORING, typingBestByDay, type RankingCheckin, type Score } from "./ranking";

const c = (over: Partial<RankingCheckin>): RankingCheckin => ({
  user_id: "ana",
  day: "2026-10-26",
  goal: "study",
  minutes: null,
  pages: null,
  annulled: false,
  ...over,
});

describe("scoreMonth", () => {
  it("adds minutes, pages, projects and completed days", () => {
    const [ana] = scoreMonth(
      ["ana"],
      [
        c({ goal: "study", minutes: 90 }),
        c({ goal: "reading", pages: 12 }),
        c({ goal: "typing" }),
        c({ goal: "project" }),
      ],
      [{ user_id: "ana", day: "2026-10-26" }],
    );
    expect(ana).toMatchObject({ studyMinutes: 90, pages: 12, projects: 1, completedDays: 1 });
    expect(ana.points).toBe(90 + 12 * 2 + 10 + 20);
  });

  it("caps daily study minutes and pages so nobody can rush", () => {
    const [ana] = scoreMonth(["ana"], [c({ minutes: 1000 }), c({ goal: "reading", pages: 900 })], []);
    expect(ana.studyMinutes).toBe(SCORING.maxStudyMinutesPerDay);
    expect(ana.pages).toBe(SCORING.maxPagesPerDay);
  });

  it("sums extra study sessions under the same daily cap", () => {
    const [ana] = scoreMonth(["ana"], [c({ minutes: 90 }), c({ minutes: 60 }), c({ minutes: 200 }), c({ day: "2026-10-27", minutes: 30 })], []);
    expect(ana.studyMinutes).toBe(SCORING.maxStudyMinutesPerDay + 30);
  });

  it("scores the day's best typing test once, only with a valid typing proof", () => {
    const best = new Map([["ana|2026-10-26", 57.4], ["ana|2026-10-27", 80]]);
    const [ana] = scoreMonth(["ana"], [c({ goal: "typing" }), c({ goal: "typing", day: "2026-10-27", annulled: true })], [], best);
    expect(ana.points).toBe(57);
  });

  it("ignores annulled check-ins and counts legacy study as 60 min", () => {
    const [ana] = scoreMonth(["ana"], [c({ minutes: 120, annulled: true }), c({ day: "2026-10-27" })], []);
    expect(ana.studyMinutes).toBe(60);
  });

  it("projects are worth little", () => {
    const scores = scoreMonth(
      ["ana", "bia"],
      [
        ...Array.from({ length: 5 }, (_, i) => c({ user_id: "ana", goal: "project", day: `2026-10-0${i + 1}` })),
        c({ user_id: "bia", minutes: 60 }),
      ],
      [],
    );
    expect(scores.map((s) => s.userId)).toEqual(["bia", "ana"]); // 60 min of study beats 5 projects
  });

  it("orders by points and shares positions on ties", () => {
    const scores = scoreMonth(["a", "b", "c"], [c({ user_id: "a", minutes: 80 }), c({ user_id: "b", minutes: 80 })], []);
    expect(scores[2].userId).toBe("c");
    expect(positions(scores)).toEqual([1, 1, 3]);
  });
});

describe("podium", () => {
  const sc = (userId: string, points: number): Score => ({ userId, points, studyMinutes: 0, pages: 0, projects: 0, completedDays: 0 });
  const shape = (scores: Score[]) => podium(scores).groups.map((g) => `${g.position}:${g.userIds.join("+")}`);

  it("1, 2, 3 without ties", () => {
    expect(shape([sc("a", 9), sc("b", 5), sc("c", 3), sc("d", 1)])).toEqual(["1:a", "2:b", "3:c"]);
    expect(podium([sc("a", 9), sc("b", 5), sc("c", 3)]).tied).toBe(false);
  });

  it("1, 1, 3: there is no second place", () => {
    const p = podium([sc("a", 9), sc("b", 9), sc("c", 3), sc("d", 1)]);
    expect(p.groups.map((g) => `${g.position}:${g.userIds.join("+")}`)).toEqual(["1:a+b", "3:c"]);
    expect(p.tied).toBe(true);
  });

  it("1, 2, 2 and four tied first keep everyone", () => {
    expect(shape([sc("a", 9), sc("b", 5), sc("c", 5), sc("d", 1)])).toEqual(["1:a", "2:b+c"]);
    expect(shape([sc("a", 4), sc("b", 4), sc("c", 4), sc("d", 4), sc("e", 1)])).toEqual(["1:a+b+c+d"]);
  });

  it("nobody with zero points; fewer than three people", () => {
    expect(shape([sc("a", 0), sc("b", 0)])).toEqual([]);
    expect(shape([sc("a", 3)])).toEqual(["1:a"]);
    expect(shape([sc("a", 3), sc("b", 0)])).toEqual(["1:a"]);
  });
});

describe("typingBestByDay", () => {
  const t = (score: number, finished_at: string) => ({ user_id: "a", day: "2026-10-29", score, finished_at });
  it("takes the best test of the day", () => {
    expect(typingBestByDay([t(30, "2026-10-29T10:00:00Z"), t(80, "2026-10-29T11:00:00Z")], []).get("a|2026-10-29")).toBe(80);
  });
  it("ignores tests judged on a typing proof the tribunal annulled", () => {
    const condemned = [{ user_id: "a", day: "2026-10-29", created_at: "2026-10-29T11:05:00Z" }];
    const best = typingBestByDay([t(200, "2026-10-29T11:00:00Z"), t(15, "2026-10-29T15:00:00Z")], condemned);
    expect(best.get("a|2026-10-29")).toBe(15);
    expect(typingBestByDay([t(200, "2026-10-29T11:00:00Z")], condemned).has("a|2026-10-29")).toBe(false);
  });
});
