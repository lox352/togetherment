import type { WeekKey } from "./week";

/**
 * Engine-facing document shapes. The shared package has no Firebase dependency:
 * timestamps appear as epoch millis. The app and sync script convert Firestore
 * Timestamps to millis in their converters.
 */

export interface ChoreSubtask {
  id: string; // stable slug within the chore, e.g. "toilet"
  name: string;
}

export interface Chore {
  id: string; // stable slug, e.g. "mop" — survives renames across epochs
  name: string;
  description?: string;
  /**
   * Optional sub-tasks (e.g. bathroom → toilet/sink/bath). Each sub-task is
   * ticked individually; the chore counts as done only when all are ticked.
   */
  subtasks?: ChoreSubtask[];
}

/**
 * An append-only snapshot of rota configuration, effective from `startWeek`
 * (always a Monday boundary). Doc ID in Firestore = startWeek.
 */
/**
 * How chores are shared out each week.
 * - "wholeWeek": one person does every chore that week, rotating weekly.
 * - "perChore": chores are split between everyone each week (the original mode).
 * Absent means "perChore" so epochs written before this setting existed keep
 * resolving exactly as they always did.
 */
export type AssignmentMode = "wholeWeek" | "perChore";

export interface RotaEpoch {
  startWeek: WeekKey;
  memberIds: string[]; // ordered — the rotation order
  chores: Chore[]; // ordered
  startOffset: number; // rotation phase at startWeek (carried over between epochs)
  assignmentMode?: AssignmentMode;
}

export interface SwapSpec {
  id: string;
  weekA: WeekKey;
  memberA: string; // uid
  weekB: WeekKey; // may equal weekA for a same-week trade
  memberB: string; // uid
  note?: string;
  createdAtMillis: number;
}

/** Single-chore reassignment; trumps base + swaps. (Post-v1 UI, engine supports it.) */
export interface OverrideSpec {
  week: WeekKey;
  choreId: string;
  assigneeUid: string;
}

export interface CompletionSpec {
  week: WeekKey;
  choreId: string;
  /** Set when this tick is for one sub-task of the chore. */
  subtaskId?: string;
  completedBy: string; // uid
  completedAtMillis?: number;
  assigneeUid?: string; // snapshot of who it was assigned to
}

export interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  active: boolean;
  /** Personal flair chosen in Settings. */
  emoji?: string;
  color?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  note?: string;
  addedBy: string;
  addedAtMillis: number;
  status: "needed" | "bought";
  boughtBy?: string;
  boughtAtMillis?: number;
}

export interface ActionItem {
  id: string;
  title: string;
  /** Absent means nobody has claimed it yet — it's up for grabs. */
  assigneeUid?: string;
  createdBy: string;
  createdAtMillis: number;
  dueDate?: string; // "YYYY-MM-DD"
  status: "open" | "done";
  completedAtMillis?: number;
}

export interface AvailabilityEntry {
  id: string;
  kind: "away" | "guest";
  memberUid: string; // who is away / who is hosting
  guestName?: string; // kind === "guest" only
  startDate: string; // "YYYY-MM-DD", inclusive
  endDate: string; // "YYYY-MM-DD", inclusive
  note?: string;
  createdBy: string;
}

export interface Gathering {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // "19:00" — absent means all-day
  kind: "meal" | "activity";
  description?: string;
  proposedBy: string;
  rsvps: Record<string, "yes" | "no" | "maybe">;
}
