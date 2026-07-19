import type { Chore, CompletionSpec, OverrideSpec, RotaEpoch, SwapSpec } from "./types";
import { addWeeks, isoWeeksBetween, type WeekKey } from "./week";

export interface ChoreAssignment {
  chore: Chore;
  /** Final assignee after swaps and overrides. */
  assigneeUid: string;
  /** Round-robin assignee before swaps/overrides. */
  baseAssigneeUid: string;
  swapped: boolean;
  overridden: boolean;
  completion?: CompletionSpec;
}

export interface WeekAssignments {
  week: WeekKey;
  epoch: RotaEpoch | null; // null when the week predates the first epoch
  assignments: ChoreAssignment[];
  /** assignments grouped by final assignee */
  byMember: Map<string, ChoreAssignment[]>;
}

function mod(x: number, n: number): number {
  return ((x % n) + n) % n;
}

/** The epoch in effect for `week`: the one with the largest startWeek <= week. */
export function resolveEpoch(epochs: RotaEpoch[], week: WeekKey): RotaEpoch | null {
  let best: RotaEpoch | null = null;
  for (const e of epochs) {
    if (e.startWeek <= week && (best === null || e.startWeek > best.startWeek)) {
      best = e;
    }
  }
  return best;
}

/** Rotation offset of `week` within `epoch`. */
export function offsetForWeek(epoch: RotaEpoch, week: WeekKey): number {
  return epoch.startOffset + isoWeeksBetween(epoch.startWeek, week);
}

/**
 * Base round-robin: chore at index i goes to memberIds[(i + offset) mod N].
 * With C chores and N members each member gets floor(C/N) or ceil(C/N) chores,
 * and both the chores and the "extra chore" burden rotate weekly.
 */
export function baseAssignments(epoch: RotaEpoch, week: WeekKey): ChoreAssignment[] {
  const n = epoch.memberIds.length;
  if (n === 0) return [];
  const offset = offsetForWeek(epoch, week);
  return epoch.chores.map((chore, i) => {
    const uid = epoch.memberIds[mod(i + offset, n)]!;
    return {
      chore,
      assigneeUid: uid,
      baseAssigneeUid: uid,
      swapped: false,
      overridden: false,
    };
  });
}

/**
 * Apply whole-week swaps to a week's assignments.
 *
 * A swap {weekA, memberA, weekB, memberB} means: in weekA every chore currently
 * assigned to memberA goes to memberB, and in weekB every chore currently
 * assigned to memberB goes to memberA. When weekA === weekB the two rules apply
 * simultaneously (a same-week exchange, not a chain).
 *
 * Swaps are applied in createdAt order so later swaps operate on the outcome of
 * earlier ones (chained swaps compose predictably).
 */
export function applySwaps(
  assignments: ChoreAssignment[],
  week: WeekKey,
  swaps: SwapSpec[],
): ChoreAssignment[] {
  const relevant = swaps
    .filter((s) => s.weekA === week || s.weekB === week)
    .sort((a, b) => a.createdAtMillis - b.createdAtMillis || (a.id < b.id ? -1 : 1));

  let current = assignments;
  for (const swap of relevant) {
    current = current.map((a) => {
      let next = a.assigneeUid;
      if (swap.weekA === week && a.assigneeUid === swap.memberA) next = swap.memberB;
      else if (swap.weekB === week && a.assigneeUid === swap.memberB) next = swap.memberA;
      if (next === a.assigneeUid) return a;
      return { ...a, assigneeUid: next, swapped: true };
    });
  }
  return current;
}

export interface ComputeWeekInput {
  epochs: RotaEpoch[];
  week: WeekKey;
  swaps?: SwapSpec[];
  overrides?: OverrideSpec[];
  completions?: CompletionSpec[];
}

/** The single entry point used by both the app and the calendar sync. */
export function computeWeek({
  epochs,
  week,
  swaps = [],
  overrides = [],
  completions = [],
}: ComputeWeekInput): WeekAssignments {
  const epoch = resolveEpoch(epochs, week);
  if (!epoch) return { week, epoch: null, assignments: [], byMember: new Map() };

  let assignments = baseAssignments(epoch, week);
  assignments = applySwaps(assignments, week, swaps);

  const overrideByChore = new Map(
    overrides.filter((o) => o.week === week).map((o) => [o.choreId, o]),
  );
  const completionByChore = new Map(
    completions.filter((c) => c.week === week).map((c) => [c.choreId, c]),
  );

  assignments = assignments.map((a) => {
    const override = overrideByChore.get(a.chore.id);
    const completion = completionByChore.get(a.chore.id);
    let result = a;
    if (override && override.assigneeUid !== a.assigneeUid) {
      result = { ...result, assigneeUid: override.assigneeUid, overridden: true };
    }
    if (completion) result = { ...result, completion };
    return result;
  });

  const byMember = new Map<string, ChoreAssignment[]>();
  for (const a of assignments) {
    const list = byMember.get(a.assigneeUid) ?? [];
    list.push(a);
    byMember.set(a.assigneeUid, list);
  }
  return { week, epoch, assignments, byMember };
}

/**
 * startOffset for a new epoch beginning at `newStartWeek`, preserving the
 * rotation phase of the previous epoch so fairness continues seamlessly.
 */
export function continuedStartOffset(prev: RotaEpoch, newStartWeek: WeekKey): number {
  return prev.startOffset + isoWeeksBetween(prev.startWeek, newStartWeek);
}

/** Epochs take effect on Monday boundaries: config edits apply from next week. */
export function nextEpochStartWeek(currentWeek: WeekKey): WeekKey {
  return addWeeks(currentWeek, 1);
}
