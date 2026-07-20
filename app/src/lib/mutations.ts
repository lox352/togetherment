import {
  weekStartUtcMillis,
  type Chore,
  type ManualCategory,
  type RotaEpoch,
  type WeekKey,
} from "@togetherment/shared";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { requestCalendarSync } from "./triggerSync";

/** Writes that change what's on the shared calendar also request a sync. */
function withSync<T>(write: Promise<T>): Promise<T> {
  return write.then((result) => {
    requestCalendarSync();
    return result;
  });
}

// --- chores / rota ---

// Chore ids are hyphenated slugs, so "_" separators are unambiguous.
function completionDocId(week: WeekKey, choreId: string, subtaskId?: string) {
  return subtaskId ? `${week}_${choreId}_${subtaskId}` : `${week}_${choreId}`;
}

export function completeChore(
  week: WeekKey,
  choreId: string,
  uid: string,
  assigneeUid: string,
  subtaskId?: string,
) {
  return setDoc(doc(db, "completions", completionDocId(week, choreId, subtaskId)), {
    week,
    choreId,
    ...(subtaskId ? { subtaskId } : {}),
    completedBy: uid,
    completedAt: serverTimestamp(),
    assigneeUid,
  });
}

export function uncompleteChore(week: WeekKey, choreId: string, subtaskId?: string) {
  return deleteDoc(doc(db, "completions", completionDocId(week, choreId, subtaskId)));
}

export function createSwap(input: {
  weekA: WeekKey;
  memberA: string;
  weekB: WeekKey;
  memberB: string;
  note?: string;
  createdBy: string;
}) {
  return withSync(
    addDoc(collection(db, "swaps"), {
      ...input,
      note: input.note ?? null,
      createdAt: serverTimestamp(),
    }),
  );
}

export function deleteSwap(id: string) {
  return withSync(deleteDoc(doc(db, "swaps", id)));
}

/**
 * Write a rota epoch. Doc ID = startWeek, so there is at most one config
 * change per week; rules allow revising an epoch until it takes effect.
 */
export function saveEpoch(epoch: RotaEpoch, createdBy: string) {
  return withSync(
    setDoc(doc(db, "rotaEpochs", epoch.startWeek), {
      startWeek: epoch.startWeek,
      memberIds: epoch.memberIds,
      chores: epoch.chores.map((c: Chore) => ({
        id: c.id,
        name: c.name,
        ...(c.description ? { description: c.description } : {}),
        ...(c.subtasks?.length
          ? { subtasks: c.subtasks.map((s) => ({ id: s.id, name: s.name })) }
          : {}),
      })),
      startOffset: epoch.startOffset,
      assignmentMode: epoch.assignmentMode ?? "wholeWeek",
      startAtMillis: weekStartUtcMillis(epoch.startWeek),
      createdBy,
      createdAt: serverTimestamp(),
    }),
  );
}

// --- member style ---

export function updateMyStyle(uid: string, style: { emoji?: string; color?: string }) {
  return setDoc(doc(db, "members", uid), style, { merge: true });
}

// --- shopping ---

export function addShoppingItem(name: string, uid: string) {
  return addDoc(collection(db, "shoppingItems"), {
    name,
    addedBy: uid,
    addedAt: serverTimestamp(),
    status: "needed",
  });
}

export function markBought(id: string, uid: string) {
  return updateDoc(doc(db, "shoppingItems", id), {
    status: "bought",
    boughtBy: uid,
    boughtAt: serverTimestamp(),
  });
}

export function markNeededAgain(id: string, uid: string) {
  return updateDoc(doc(db, "shoppingItems", id), {
    status: "needed",
    addedBy: uid,
    addedAt: serverTimestamp(),
    boughtBy: deleteField(),
    boughtAt: deleteField(),
  });
}

export function deleteShoppingItem(id: string) {
  return deleteDoc(doc(db, "shoppingItems", id));
}

// --- action items ---

export function addActionItem(input: {
  title: string;
  /** Omit to leave it up for grabs. */
  assigneeUid?: string;
  dueDate?: string;
  createdBy: string;
}) {
  return addDoc(collection(db, "actionItems"), {
    title: input.title,
    ...(input.assigneeUid ? { assigneeUid: input.assigneeUid } : {}),
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    status: "open",
  });
}

export function setActionItemStatus(id: string, done: boolean) {
  return updateDoc(doc(db, "actionItems", id), {
    status: done ? "done" : "open",
    completedAt: done ? serverTimestamp() : deleteField(),
  });
}

export function deleteActionItem(id: string) {
  return deleteDoc(doc(db, "actionItems", id));
}

/** Take ownership of an unassigned one-off. */
export function claimActionItem(id: string, uid: string) {
  return updateDoc(doc(db, "actionItems", id), { assigneeUid: uid });
}

/** Put a one-off back in the up-for-grabs pile. */
export function releaseActionItem(id: string) {
  return updateDoc(doc(db, "actionItems", id), { assigneeUid: deleteField() });
}

// --- availability ---

export function addAvailability(input: {
  kind: "away" | "guest";
  memberUid: string;
  guestName?: string;
  startDate: string;
  endDate: string;
  note?: string;
  createdBy: string;
}) {
  return withSync(
    addDoc(collection(db, "availability"), {
      kind: input.kind,
      memberUid: input.memberUid,
      ...(input.guestName ? { guestName: input.guestName } : {}),
      startDate: input.startDate,
      endDate: input.endDate,
      ...(input.note ? { note: input.note } : {}),
      createdBy: input.createdBy,
      createdAt: serverTimestamp(),
    }),
  );
}

export function deleteAvailability(id: string) {
  return withSync(deleteDoc(doc(db, "availability", id)));
}

// --- house manual ---

export function saveManualEntry(
  entry: { id?: string; title: string; body: string; category: ManualCategory },
  uid: string,
) {
  const payload = {
    title: entry.title,
    body: entry.body,
    category: entry.category,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };
  return entry.id
    ? setDoc(doc(db, "manual", entry.id), payload, { merge: true })
    : addDoc(collection(db, "manual"), payload);
}

export function deleteManualEntry(id: string) {
  return deleteDoc(doc(db, "manual", id));
}

/** Stub entries to fill in — an empty manual is harder to start than a sketched one. */
export const MANUAL_SEEDS: Array<{ title: string; category: ManualCategory; body: string }> = [
  { title: "Wifi", category: "wifi", body: "network:\npassword:" },
  { title: "Bin & recycling night", category: "bins", body: "Set out after 8pm on:" },
  { title: "Super", category: "contacts", body: "name:\nphone:" },
  { title: "Landlord / management", category: "contacts", body: "name:\nphone:\nemail:" },
  { title: "Buzzer & packages", category: "building", body: "" },
  { title: "Radiators & boiler", category: "appliances", body: "" },
  { title: "Laundry", category: "appliances", body: "" },
];

export function seedManual(uid: string) {
  return Promise.all(
    MANUAL_SEEDS.map((s) =>
      addDoc(collection(db, "manual"), {
        ...s,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

// --- gatherings ---

export function addGathering(input: {
  title: string;
  date: string;
  time?: string;
  kind: "meal" | "activity";
  description?: string;
  proposedBy: string;
}) {
  return withSync(
    addDoc(collection(db, "gatherings"), {
      title: input.title,
      date: input.date,
      ...(input.time ? { time: input.time } : {}),
      kind: input.kind,
      ...(input.description ? { description: input.description } : {}),
      proposedBy: input.proposedBy,
      createdAt: serverTimestamp(),
      rsvps: {},
    }),
  );
}

export function setRsvp(id: string, uid: string, value: "yes" | "no" | "maybe") {
  return updateDoc(doc(db, "gatherings", id), { [`rsvps.${uid}`]: value });
}

export function deleteGathering(id: string) {
  return withSync(deleteDoc(doc(db, "gatherings", id)));
}
