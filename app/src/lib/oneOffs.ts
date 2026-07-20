import {
  choreWeekEndDate,
  choreWeekStartDate,
  currentWeekKey,
  type ActionItem,
} from "@togetherment/shared";
import { todayDateString } from "./format";

const DUST_AFTER_DAYS = 30;

export interface OneOffView {
  item: ActionItem;
  overdue: boolean;
  dueThisWeek: boolean;
  /** Undated and sitting around for over a month. */
  gatheringDust: boolean;
}

/** Urgency is derived from what's already stored — no extra fields. */
export function describeOneOff(item: ActionItem, now: Date = new Date()): OneOffView {
  const today = todayDateString();
  const week = currentWeekKey(now);
  const overdue = !!item.dueDate && item.dueDate < today;
  return {
    item,
    overdue,
    dueThisWeek:
      !!item.dueDate &&
      !overdue &&
      item.dueDate >= choreWeekStartDate(week) &&
      item.dueDate <= choreWeekEndDate(week),
    gatheringDust:
      !item.dueDate &&
      item.createdAtMillis > 0 &&
      now.getTime() - item.createdAtMillis > DUST_AFTER_DAYS * 86_400_000,
  };
}

/** Overdue first, then by due date, then undated oldest first so stale things nag. */
export function sortOneOffs(items: ActionItem[], now: Date = new Date()): OneOffView[] {
  return items
    .map((item) => describeOneOff(item, now))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      const aDue = a.item.dueDate;
      const bDue = b.item.dueDate;
      if (aDue && bDue) return aDue < bDue ? -1 : aDue > bDue ? 1 : 0;
      if (aDue) return -1;
      if (bDue) return 1;
      return a.item.createdAtMillis - b.item.createdAtMillis;
    });
}

export const openOneOffs = (items: ActionItem[] | undefined) =>
  (items ?? []).filter((i) => i.status === "open");

export const mine = (items: ActionItem[], uid: string) =>
  items.filter((i) => i.assigneeUid === uid);

export const unassigned = (items: ActionItem[]) => items.filter((i) => !i.assigneeUid);
