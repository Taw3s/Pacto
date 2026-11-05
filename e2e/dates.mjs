// The test scenario is anchored on "today" in São Paulo, so the suite runs on any date.
//
//   T-7          before anyone joined
//   T-6 (JOIN)   everyone joins; it is the group's day off (weekday of tomorrow), so it never counts
//   T-5 … T-1    five obligation days
//   T            today (never a debt until 23:59)
//
// The day off is "tomorrow's weekday" (see setup.sql), so nobody is on a day off today and the
// expected numbers (streaks, debts, buttons) are the same whatever the real date is.
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

export const TODAY = fmt.format(new Date());

export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const T = (n) => addDays(TODAY, n); // T(-1) = yesterday
export const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();
export const OFF = (weekday(TODAY) + 1) % 7;
export const JOIN = T(-6);

export const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const ddmm = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
export const monthKey = (day) => day.slice(0, 7);
export const monthName = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
export const nextMonday = (day) => addDays(day, ((8 - weekday(day)) % 7) || 7);

export function eachDay(from, to) {
  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
export const PREV_MONTH = monthKey(addDays(`${monthKey(TODAY)}-01`, -1));
/** Caio joined on the 20th of the previous month: his debts from then are "atrasadas" (≥ 6 of them in any month). */
export const CAIO_JOIN = `${PREV_MONTH}-20`;
export const lastOfPrevMonth = addDays(`${monthKey(TODAY)}-01`, -1);
/** Days that owe 1 Coca + 1 salgado: the day after joining..yesterday, minus the day off (the join day never owes). */
export const owedDays = (joined, to = T(-1)) => eachDay(addDays(joined, 1), to).filter((d) => weekday(d) !== OFF);
