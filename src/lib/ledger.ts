// Derives day status, streaks and debts from raw data. No cron: everything is
// computed on request, comparing São Paulo dates. The payments trigger in
// supabase/migrations/0001_init.sql mirrors the "missed day" rule — keep both in sync.
import { addDays, eachDay, monthKey, weekdayOf, type ISODate } from "./dates";
import { DEBT_ITEMS, DEFAULT_MENU, type DebtItem } from "./debt-items";

export type DayStatus = "done" | "missed" | "off" | "pending" | "before";
export type { DebtItem };

/** A group's debt menu from a day on (supabase debt_menus); the latest one in force applies. */
export interface DebtMenu {
  effective_from: ISODate;
  items: DebtItem[];
}

/** The items a missed day costs (mirrors debt_items_on in the database). */
export function itemsOn(menus: DebtMenu[], day: ISODate): DebtItem[] {
  let current: DebtMenu | undefined;
  for (const m of menus) {
    if (m.effective_from <= day && (!current || m.effective_from > current.effective_from)) current = m;
  }
  return current?.items ?? DEFAULT_MENU;
}

export interface DayOffChange {
  weekday: number;
  effective_from: ISODate;
}

export interface MemberLedgerInput {
  joinedOn: ISODate;
  dayOffChanges: DayOffChange[];
  completedDays: Set<ISODate>;
}

export interface Payment {
  day: ISODate;
  item: DebtItem;
  /** Null once the receiver left the group; received_name keeps who it was. */
  received_by: string | null;
  received_name?: string | null;
  paid_at: string;
}

export const DEFAULT_DAY_OFF = 0; // Sunday

export function dayOffOn(changes: DayOffChange[], day: ISODate): number {
  let current: DayOffChange | undefined;
  for (const c of changes) {
    if (c.effective_from <= day && (!current || c.effective_from > current.effective_from)) current = c;
  }
  return current?.weekday ?? DEFAULT_DAY_OFF;
}

export function dayStatus(input: MemberLedgerInput, day: ISODate, today: ISODate): DayStatus {
  if (day < input.joinedOn || day > today) return "before";
  if (weekdayOf(day) === dayOffOn(input.dayOffChanges, day)) return "off";
  if (input.completedDays.has(day)) return "done";
  if (day === today) return "pending";
  // The join day never owes (0025): whoever joins at 22h is not in debt at 23:59. Done, it still counts.
  return day === input.joinedOn ? "before" : "missed";
}

export function missedDays(input: MemberLedgerInput, today: ISODate): ISODate[] {
  const yesterday = addDays(today, -1);
  if (yesterday < input.joinedOn) return [];
  return eachDay(input.joinedOn, yesterday).filter((d) => dayStatus(input, d, today) === "missed");
}

/** Consecutive completed days. Days off neither break nor add; today counts only once done. */
export function currentStreak(input: MemberLedgerInput, today: ISODate): number {
  let streak = 0;
  for (let d = today; d >= input.joinedOn; d = addDays(d, -1)) {
    const status = dayStatus(input, d, today);
    if (status === "done") streak++;
    else if (status === "missed") break;
  }
  return streak;
}

export interface DebtLine {
  day: ISODate;
  item: DebtItem;
  overdue: boolean; // missed in a previous month and still unpaid
  payment?: Payment;
}

/** The items of the group's menu for each missed day (1 Coca + 1 salgado by default); each settled independently. */
export function debtLines(input: MemberLedgerInput, payments: Payment[], today: ISODate, menus: DebtMenu[] = []): DebtLine[] {
  const paid = new Map(payments.map((p) => [`${p.day}|${p.item}`, p]));
  const lines: DebtLine[] = [];
  for (const day of missedDays(input, today)) {
    for (const item of itemsOn(menus, day)) {
      const payment = paid.get(`${day}|${item}`);
      lines.push({ day, item, payment, overdue: !payment && monthKey(day) < monthKey(today) });
    }
  }
  return lines;
}

/** Open items per kind (in catalog order), their total and how many are overdue. */
export function debtSummary(lines: DebtLine[]) {
  const open = lines.filter((l) => !l.payment);
  const counts = new Map<DebtItem, number>();
  for (const l of open) counts.set(l.item, (counts.get(l.item) ?? 0) + 1);
  const ordered = [...counts.entries()].sort((a, b) => DEBT_ITEMS.indexOf(a[0]) - DEBT_ITEMS.indexOf(b[0]));
  return { counts: ordered, total: open.length, overdue: open.filter((l) => l.overdue).length };
}

/** Streak milestones shown as a plaque in the history (visual only: no points, no rule). */
export const STREAK_MILESTONES = [3, 7, 14, 30] as const;

export function streakMilestone(streak: number): number | null {
  return [...STREAK_MILESTONES].reverse().find((n) => streak >= n) ?? null;
}
