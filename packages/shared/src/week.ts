import { HOUSEHOLD_TZ } from "./config";

/** ISO week key, e.g. "2026-W30". Zero-padded so string comparison sorts correctly. */
export type WeekKey = string;

const DAY_MS = 86_400_000;

export interface IsoWeek {
  isoYear: number;
  week: number;
}

/** ISO week (and week-year) containing the calendar date y-m-d. Month is 1-based. */
export function isoWeekOfDate(y: number, m: number, d: number): IsoWeek {
  const t = Date.UTC(y, m - 1, d);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
  // The Thursday of this week determines the ISO week-year.
  const thursday = t + (3 - dow) * DAY_MS;
  const isoYear = new Date(thursday).getUTCFullYear();
  const jan1 = Date.UTC(isoYear, 0, 1);
  const week = Math.floor((thursday - jan1) / DAY_MS / 7) + 1;
  return { isoYear, week };
}

export function formatWeekKey({ isoYear, week }: IsoWeek): WeekKey {
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function parseWeekKey(key: WeekKey): IsoWeek {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid week key: ${key}`);
  return { isoYear: Number(match[1]), week: Number(match[2]) };
}

/** "YYYY-MM-DD" for `now` as observed in `tz`. */
export function dateStringInTz(now: Date, tz: string = HOUSEHOLD_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function weekKeyOfDateString(dateStr: string): WeekKey {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date string: ${dateStr}`);
  return formatWeekKey(isoWeekOfDate(y, m, d));
}

/** The household's current ISO week (computed in HOUSEHOLD_TZ regardless of device timezone). */
export function currentWeekKey(now: Date = new Date(), tz: string = HOUSEHOLD_TZ): WeekKey {
  return weekKeyOfDateString(dateStringInTz(now, tz));
}

/** UTC millis of the Monday that starts the given ISO week. */
export function mondayUtcMillis(key: WeekKey): number {
  const { isoYear, week } = parseWeekKey(key);
  // Jan 4 is always in ISO week 1 of its week-year.
  const jan4 = Date.UTC(isoYear, 0, 4);
  const jan4Dow = (new Date(jan4).getUTCDay() + 6) % 7;
  const week1Monday = jan4 - jan4Dow * DAY_MS;
  return week1Monday + (week - 1) * 7 * DAY_MS;
}

function utcMillisToDateString(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" of the Monday starting the given week. */
export function mondayOfWeek(key: WeekKey): string {
  return utcMillisToDateString(mondayUtcMillis(key));
}

/** "YYYY-MM-DD" of the Sunday ending the given week. */
export function sundayOfWeek(key: WeekKey): string {
  return utcMillisToDateString(mondayUtcMillis(key) + 6 * DAY_MS);
}

/** Whole weeks from week `a` to week `b` (positive if b is later). */
export function isoWeeksBetween(a: WeekKey, b: WeekKey): number {
  return Math.round((mondayUtcMillis(b) - mondayUtcMillis(a)) / (7 * DAY_MS));
}

export function addWeeks(key: WeekKey, n: number): WeekKey {
  const t = mondayUtcMillis(key) + n * 7 * DAY_MS;
  const d = new Date(t);
  return formatWeekKey(isoWeekOfDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
}

/** Compare two date strings ("YYYY-MM-DD"); lexicographic works but this is explicit. */
export function compareDateStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
