import type { AssignmentMode, RotaEpoch } from "./types";

/**
 * Build a RotaEpoch from a Firestore document. Shared by the app and the
 * calendar sync so they can never disagree about how a week is assigned —
 * previously each had its own converter and one silently dropped a field.
 */
export function parseEpochDoc(id: string, data: Record<string, unknown>): RotaEpoch {
  return {
    startWeek: (data.startWeek as string) ?? id,
    memberIds: (data.memberIds as string[]) ?? [],
    chores: (data.chores as RotaEpoch["chores"]) ?? [],
    startOffset: (data.startOffset as number) ?? 0,
    assignmentMode: (data.assignmentMode as AssignmentMode | undefined) ?? undefined,
  };
}
