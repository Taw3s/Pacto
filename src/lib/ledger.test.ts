import { describe, expect, it } from "vitest";
import { addDays, eachDay, lastDayOfMonth, msUntilEndOfDay, nextMonday, spToday, weekdayOf } from "./dates";
import { currentStreak, dayOffOn, dayStatus, debtLines, debtSummary, itemsOn, missedDays, streakMilestone, type MemberLedgerInput } from "./ledger";

describe("dates (America/Sao_Paulo)", () => {
  it("uses São Paulo date, not UTC, around midnight", () => {
    // 2026-10-24 01:30 UTC is still 2026-10-23 22:30 in São Paulo
    expect(spToday(new Date("2026-10-24T01:30:00Z"))).toBe("2026-10-23");
    expect(spToday(new Date("2026-10-24T03:00:00Z"))).toBe("2026-10-24");
  });

  it("computes time left until 23:59:59 in São Paulo", () => {
    // 22:30 SP -> 1h30 left
    expect(msUntilEndOfDay(new Date("2026-10-24T01:30:00.000Z"))).toBe(90 * 60 * 1000);
  });

  it("does calendar math", () => {
    expect(weekdayOf("2026-10-25")).toBe(0); // Sunday
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(eachDay("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(lastDayOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(nextMonday("2026-10-23")).toBe("2026-10-26"); // Friday
    expect(nextMonday("2026-10-25")).toBe("2026-10-26"); // Sunday
    expect(nextMonday("2026-10-26")).toBe("2026-11-02"); // Monday -> following week
  });
});

// Week of 2026-10-19 (Mon) .. 2026-10-25 (Sun)
const base = (over: Partial<MemberLedgerInput> = {}): MemberLedgerInput => ({
  joinedOn: "2026-10-19",
  dayOffChanges: [{ weekday: 0, effective_from: "2026-10-19" }],
  completedDays: new Set(),
  ...over,
});

describe("ledger", () => {
  it("classifies days", () => {
    const m = base({ completedDays: new Set(["2026-10-19", "2026-10-21"]) });
    const today = "2026-10-21";
    expect(dayStatus(m, "2026-10-18", today)).toBe("before");
    expect(dayStatus(m, "2026-10-19", today)).toBe("done");
    expect(dayStatus(m, "2026-10-20", today)).toBe("missed");
    expect(dayStatus(m, "2026-10-21", today)).toBe("done");
    expect(dayStatus(m, "2026-10-22", today)).toBe("before");
  });

  it("the join day never owes, but counts when done", () => {
    const today = "2026-10-21";
    expect(dayStatus(base(), "2026-10-19", today)).toBe("before");
    expect(dayStatus(base(), "2026-10-19", "2026-10-19")).toBe("pending");
    expect(missedDays(base(), today)).toEqual(["2026-10-20"]);
    const m = base({ completedDays: new Set(["2026-10-19", "2026-10-20"]) });
    expect(currentStreak(m, today)).toBe(2);
    expect(currentStreak(base({ completedDays: new Set(["2026-10-20"]) }), today)).toBe(1);
  });

  it("today is pending, never missed, until it ends", () => {
    expect(dayStatus(base(), "2026-10-21", "2026-10-21")).toBe("pending");
    expect(missedDays(base(), "2026-10-19")).toEqual([]);
  });

  it("respects day off and its history (changes never rewrite the past)", () => {
    const m = base({
      dayOffChanges: [
        { weekday: 0, effective_from: "2026-10-19" },
        { weekday: 3, effective_from: "2026-10-26" }, // Wednesday from next week on
      ],
    });
    expect(dayOffOn(m.dayOffChanges, "2026-10-25")).toBe(0);
    expect(dayOffOn(m.dayOffChanges, "2026-10-28")).toBe(3);
    expect(dayStatus(m, "2026-10-25", "2026-10-30")).toBe("off");
    expect(dayStatus(m, "2026-10-28", "2026-10-30")).toBe("off");
    expect(dayStatus(m, "2026-11-01", "2026-11-02")).toBe("missed"); // Sunday no longer off
  });

  it("defaults to Sunday without history", () => {
    expect(dayOffOn([], "2026-10-25")).toBe(0);
  });

  it("counts streaks skipping days off", () => {
    const m = base({
      completedDays: new Set(["2026-10-23", "2026-10-24", "2026-10-26"]),
    });
    // 23 done, 24 done, 25 off (Sunday), 26 done, 27 today pending
    expect(currentStreak(m, "2026-10-27")).toBe(3);
    // a missed day breaks it: 22 missed
    expect(currentStreak(m, "2026-10-26")).toBe(3);
    expect(currentStreak(base(), "2026-10-27")).toBe(0);
  });

  it("produces one coke + one snack per missed day, with payments and overdue", () => {
    const m = base({ joinedOn: "2026-10-28", completedDays: new Set(["2026-10-30"]) });
    // 28 joined (never owes), 29 missed, 30 done, 31 missed, Nov 1 Sunday off, Nov 2 today
    const lines = debtLines(
      m,
      [{ day: "2026-10-29", item: "coke", received_by: "u2", paid_at: "2026-10-29T20:00:00Z" }],
      "2026-11-02",
    );
    expect(lines).toHaveLength(4);
    expect(lines.filter((l) => l.payment)).toHaveLength(1);
    expect(lines.every((l) => l.payment || l.overdue)).toBe(true); // October unpaid is overdue in November
    expect(debtSummary(lines)).toEqual({ counts: [["coke", 1], ["snack", 2]], total: 3, overdue: 3 });
  });

  it("debt in the current month is not overdue", () => {
    const lines = debtLines(base(), [], "2026-10-21");
    expect(lines.map((l) => l.day)).toEqual(["2026-10-20", "2026-10-20"]);
    expect(lines.some((l) => l.overdue)).toBe(false);
  });
});

describe("debt menu", () => {
  const menus = [
    { effective_from: "2026-10-01", items: ["coffee" as const] },
    { effective_from: "2026-10-20", items: ["pizza" as const, "pix" as const] },
  ];

  it("uses the menu in force on each missed day, and Coca + salgado before any menu", () => {
    expect(itemsOn(menus, "2026-09-30")).toEqual(["coke", "snack"]);
    expect(itemsOn(menus, "2026-10-19")).toEqual(["coffee"]);
    expect(itemsOn(menus, "2026-10-20")).toEqual(["pizza", "pix"]);
    expect(itemsOn([...menus].reverse(), "2026-10-25")).toEqual(["pizza", "pix"]);
  });

  it("charges each missed day with its own menu", () => {
    const lines = debtLines(base({ joinedOn: "2026-10-18" }), [], "2026-10-21", menus); // joined on a Sunday off
    expect(lines.map((l) => `${l.day} ${l.item}`)).toEqual(["2026-10-19 coffee", "2026-10-20 pizza", "2026-10-20 pix"]);
    expect(debtSummary(lines)).toEqual({ counts: [["coffee", 1], ["pizza", 1], ["pix", 1]], total: 3, overdue: 0 });
  });
});

describe("streakMilestone", () => {
  it("returns the highest milestone reached, or null below 3", () => {
    expect(streakMilestone(0)).toBeNull();
    expect(streakMilestone(2)).toBeNull();
    expect(streakMilestone(3)).toBe(3);
    expect(streakMilestone(6)).toBe(3);
    expect(streakMilestone(7)).toBe(7);
    expect(streakMilestone(29)).toBe(14);
    expect(streakMilestone(120)).toBe(30);
  });
});
