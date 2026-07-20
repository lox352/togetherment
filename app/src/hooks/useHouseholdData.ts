import { parseEpochDoc } from "@togetherment/shared";
import type {
  ActionItem,
  AvailabilityEntry,
  CompletionSpec,
  Gathering,
  ManualEntry,
  Member,
  OverrideSpec,
  RotaEpoch,
  ShoppingItem,
  SwapSpec,
} from "@togetherment/shared";
import {
  collection,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useCollection } from "./useCollection";

function millis(value: unknown): number {
  return value ? (value as Timestamp).toMillis() : 0;
}

export function useMembers(): Member[] | undefined {
  return useCollection(
    () => query(collection(db, "members")),
    (snap: QueryDocumentSnapshot<DocumentData>): Member => {
      const d = snap.data();
      return {
        uid: snap.id,
        displayName: d.displayName ?? "Unknown",
        email: d.email ?? "",
        photoURL: d.photoURL ?? undefined,
        active: d.active !== false,
        emoji: d.emoji ?? undefined,
        color: d.color ?? undefined,
      };
    },
  );
}

export function useEpochs(): RotaEpoch[] | undefined {
  return useCollection(
    () => query(collection(db, "rotaEpochs")),
    (snap): RotaEpoch => parseEpochDoc(snap.id, snap.data()),
  );
}

export function useSwaps(): SwapSpec[] | undefined {
  return useCollection(
    () => query(collection(db, "swaps")),
    (snap): SwapSpec => {
      const d = snap.data();
      return {
        id: snap.id,
        weekA: d.weekA,
        memberA: d.memberA,
        weekB: d.weekB,
        memberB: d.memberB,
        note: d.note ?? undefined,
        createdAtMillis: millis(d.createdAt),
      };
    },
  );
}

export function useCompletions(): CompletionSpec[] | undefined {
  return useCollection(
    () => query(collection(db, "completions")),
    (snap): CompletionSpec => {
      const d = snap.data();
      return {
        week: d.week,
        choreId: d.choreId,
        subtaskId: d.subtaskId ?? undefined,
        completedBy: d.completedBy,
        completedAtMillis: millis(d.completedAt),
        assigneeUid: d.assigneeUid ?? undefined,
      };
    },
  );
}

export function useOverrides(): OverrideSpec[] | undefined {
  return useCollection(
    () => query(collection(db, "overrides")),
    (snap): OverrideSpec => {
      const d = snap.data();
      return { week: d.week, choreId: d.choreId, assigneeUid: d.assigneeUid };
    },
  );
}

export function useShoppingItems(): ShoppingItem[] | undefined {
  return useCollection(
    () => query(collection(db, "shoppingItems")),
    (snap): ShoppingItem => {
      const d = snap.data();
      return {
        id: snap.id,
        name: d.name,
        note: d.note ?? undefined,
        addedBy: d.addedBy,
        addedAtMillis: millis(d.addedAt),
        status: d.status ?? "needed",
        boughtBy: d.boughtBy ?? undefined,
        boughtAtMillis: d.boughtAt ? millis(d.boughtAt) : undefined,
      };
    },
  );
}

export function useActionItems(): ActionItem[] | undefined {
  return useCollection(
    () => query(collection(db, "actionItems")),
    (snap): ActionItem => {
      const d = snap.data();
      return {
        id: snap.id,
        title: d.title,
        assigneeUid: d.assigneeUid ?? undefined,
        createdBy: d.createdBy,
        createdAtMillis: millis(d.createdAt),
        dueDate: d.dueDate ?? undefined,
        status: d.status ?? "open",
        completedAtMillis: d.completedAt ? millis(d.completedAt) : undefined,
      };
    },
  );
}

export function useAvailability(): AvailabilityEntry[] | undefined {
  return useCollection(
    () => query(collection(db, "availability")),
    (snap): AvailabilityEntry => {
      const d = snap.data();
      return {
        id: snap.id,
        kind: d.kind,
        memberUid: d.memberUid,
        guestName: d.guestName ?? undefined,
        startDate: d.startDate,
        endDate: d.endDate,
        note: d.note ?? undefined,
        createdBy: d.createdBy,
      };
    },
  );
}

export function useManual(): ManualEntry[] | undefined {
  return useCollection(
    () => query(collection(db, "manual")),
    (snap): ManualEntry => {
      const d = snap.data();
      return {
        id: snap.id,
        title: d.title ?? "",
        body: d.body ?? "",
        category: d.category ?? "other",
        updatedBy: d.updatedBy ?? "",
        updatedAtMillis: millis(d.updatedAt),
      };
    },
  );
}

export function useGatherings(): Gathering[] | undefined {
  return useCollection(
    () => query(collection(db, "gatherings")),
    (snap): Gathering => {
      const d = snap.data();
      return {
        id: snap.id,
        title: d.title,
        date: d.date,
        time: d.time ?? undefined,
        kind: d.kind ?? "meal",
        description: d.description ?? undefined,
        proposedBy: d.proposedBy,
        rsvps: d.rsvps ?? {},
      };
    },
  );
}

/** Everything the rota views need, in engine-ready form. */
export function useRotaData() {
  const epochs = useEpochs();
  const swaps = useSwaps();
  const overrides = useOverrides();
  const completions = useCompletions();
  const members = useMembers();
  const loading =
    epochs === undefined ||
    swaps === undefined ||
    overrides === undefined ||
    completions === undefined ||
    members === undefined;
  return { epochs, swaps, overrides, completions, members, loading };
}
