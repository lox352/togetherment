import {
  addDaysToDateString,
  addWeeks,
  choreWeekEndDate,
  choreWeekStartDate,
  computeWeek,
  currentWeekKey,
  type AvailabilityEntry,
  type CompletionSpec,
  type OverrideSpec,
  type RotaEpoch,
  type SwapSpec,
  type WeekKey,
} from "@togetherment/shared";

export interface Clash {
  week: WeekKey;
  /** The away period overlapping this chore week. */
  away: AvailabilityEntry;
  /** True when they're away for the whole Fri–Mon window chores are meant for. */
  missesWholeWindow: boolean;
  choreCount: number;
}

const WEEKS_AHEAD = 8;

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Weeks where someone is assigned chores but will be away for some of the
 * Friday–Monday window those chores are meant to happen in. Swaps are already
 * applied, so a week they've handed over no longer clashes.
 */
export function findClashes(
  uid: string,
  epochs: RotaEpoch[],
  swaps: SwapSpec[],
  overrides: OverrideSpec[],
  completions: CompletionSpec[],
  availability: AvailabilityEntry[],
): Clash[] {
  const away = availability.filter((a) => a.kind === "away" && a.memberUid === uid);
  if (away.length === 0) return [];

  const clashes: Clash[] = [];
  const start = currentWeekKey();
  for (let i = 0; i <= WEEKS_AHEAD; i++) {
    const week = addWeeks(start, i);
    const computed = computeWeek({ epochs, week, swaps, overrides, completions });
    const mine = computed.byMember.get(uid) ?? [];
    if (mine.length === 0) continue;
    // Chores are encouraged Friday–Monday; being away midweek is fine.
    const windowStart = choreWeekStartDate(week);
    const windowEnd = addDaysToDateString(windowStart, 3);
    const outstanding = mine.filter((a) => !a.done);
    if (outstanding.length === 0) continue;

    for (const entry of away) {
      if (!overlaps(entry.startDate, entry.endDate, windowStart, windowEnd)) continue;
      clashes.push({
        week,
        away: entry,
        missesWholeWindow: entry.startDate <= windowStart && entry.endDate >= windowEnd,
        choreCount: outstanding.length,
      });
      break; // one warning per week is enough
    }
  }
  return clashes;
}

/** True when this away entry covers any part of the given chore week. */
export function awayDuringWeek(entry: AvailabilityEntry, week: WeekKey): boolean {
  return overlaps(entry.startDate, entry.endDate, choreWeekStartDate(week), choreWeekEndDate(week));
}
