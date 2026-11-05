// All "day" logic runs in America/Sao_Paulo. Days are ISO strings "YYYY-MM-DD".
export const TIME_ZONE = "America/Sao_Paulo";

export type ISODate = string;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function spToday(now: Date = new Date()): ISODate {
  return dayFormatter.format(now);
}

function toUTCDate(day: ISODate): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTCDate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday (same as Postgres `extract(dow)`). */
export function weekdayOf(day: ISODate): number {
  return toUTCDate(day).getUTCDay();
}

export function addDays(day: ISODate, n: number): ISODate {
  const date = toUTCDate(day);
  date.setUTCDate(date.getUTCDate() + n);
  return fromUTCDate(date);
}

/** Inclusive range of days. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Monday after `day` (same rule as Postgres `next_monday`): day-off changes start there. */
export function nextMonday(day: ISODate): ISODate {
  return addDays(day, ((8 - weekdayOf(day)) % 7) || 7);
}

export function monthKey(day: ISODate): string {
  return day.slice(0, 7);
}

export function lastDayOfMonth(day: ISODate): ISODate {
  const [y, m] = day.split("-").map(Number);
  return fromUTCDate(new Date(Date.UTC(y, m, 0)));
}

/** Milliseconds left until 23:59:59.999 in São Paulo. */
export function msUntilEndOfDay(now: Date = new Date()): number {
  const [h, m, s] = clockFormatter.format(now).split(":").map(Number);
  const elapsed = (h * 3600 + m * 60 + s) * 1000 + now.getMilliseconds();
  return Math.max(0, 86_400_000 - elapsed);
}

export const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function formatDayPt(day: ISODate): string {
  const [, m, d] = day.split("-");
  return `${WEEKDAYS_PT[weekdayOf(day)].slice(0, 3)} ${d}/${m}`;
}
