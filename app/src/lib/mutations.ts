import {
  mondayUtcMillis,
  type Chore,
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

// --- chores / rota ---

export function completeChore(week: WeekKey, choreId: string, uid: string, assigneeUid: string) {
  return setDoc(doc(db, "completions", `${week}_${choreId}`), {
    week,
    choreId,
    completedBy: uid,
    completedAt: serverTimestamp(),
    assigneeUid,
  });
}

export function uncompleteChore(week: WeekKey, choreId: string) {
  return deleteDoc(doc(db, "completions", `${week}_${choreId}`));
}

export function createSwap(input: {
  weekA: WeekKey;
  memberA: string;
  weekB: WeekKey;
  memberB: string;
  note?: string;
  createdBy: string;
}) {
  return addDoc(collection(db, "swaps"), {
    ...input,
    note: input.note ?? null,
    createdAt: serverTimestamp(),
  });
}

export function deleteSwap(id: string) {
  return deleteDoc(doc(db, "swaps", id));
}

/**
 * Write a rota epoch. Doc ID = startWeek, so there is at most one config
 * change per week; rules allow revising an epoch until it takes effect.
 */
export function saveEpoch(epoch: RotaEpoch, createdBy: string) {
  return setDoc(doc(db, "rotaEpochs", epoch.startWeek), {
    startWeek: epoch.startWeek,
    memberIds: epoch.memberIds,
    chores: epoch.chores.map((c: Chore) => ({
      id: c.id,
      name: c.name,
      ...(c.description ? { description: c.description } : {}),
    })),
    startOffset: epoch.startOffset,
    startAtMillis: mondayUtcMillis(epoch.startWeek),
    createdBy,
    createdAt: serverTimestamp(),
  });
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
  assigneeUid: string;
  dueDate?: string;
  createdBy: string;
}) {
  return addDoc(collection(db, "actionItems"), {
    title: input.title,
    assigneeUid: input.assigneeUid,
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
  return addDoc(collection(db, "availability"), {
    kind: input.kind,
    memberUid: input.memberUid,
    ...(input.guestName ? { guestName: input.guestName } : {}),
    startDate: input.startDate,
    endDate: input.endDate,
    ...(input.note ? { note: input.note } : {}),
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });
}

export function deleteAvailability(id: string) {
  return deleteDoc(doc(db, "availability", id));
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
  return addDoc(collection(db, "gatherings"), {
    title: input.title,
    date: input.date,
    ...(input.time ? { time: input.time } : {}),
    kind: input.kind,
    ...(input.description ? { description: input.description } : {}),
    proposedBy: input.proposedBy,
    createdAt: serverTimestamp(),
    rsvps: {},
  });
}

export function setRsvp(id: string, uid: string, value: "yes" | "no" | "maybe") {
  return updateDoc(doc(db, "gatherings", id), { [`rsvps.${uid}`]: value });
}

export function deleteGathering(id: string) {
  return deleteDoc(doc(db, "gatherings", id));
}
