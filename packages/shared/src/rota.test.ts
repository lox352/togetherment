import { describe, expect, it } from "vitest";
import {
  baseAssignments,
  computeWeek,
  continuedStartOffset,
  nextEpochStartWeek,
  resolveEpoch,
} from "./rota";
import { parseEpochDoc } from "./parse";
import type { RotaEpoch, SwapSpec } from "./types";
import { addWeeks } from "./week";

const CHORES = [
  { id: "mop", name: "Mop everywhere" },
  { id: "vacuum", name: "Vacuum everywhere" },
  { id: "dust", name: "Dust and clean surfaces" },
  { id: "bathroom", name: "Clean toilet, sink and bath" },
  { id: "stove", name: "Clean the stove" },
  { id: "fridge", name: "Check fridge, discard mouldy food" },
];

const epoch = (over: Partial<RotaEpoch> = {}): RotaEpoch => ({
  startWeek: "2026-W30",
  memberIds: ["alice", "bob", "carol"],
  chores: CHORES,
  startOffset: 0,
  ...over,
});

const swap = (over: Partial<SwapSpec>): SwapSpec => ({
  id: "s1",
  weekA: "2026-W31",
  memberA: "alice",
  weekB: "2026-W32",
  memberB: "bob",
  createdAtMillis: 1,
  ...over,
});

describe("resolveEpoch", () => {
  it("picks the latest epoch at or before the week", () => {
    const e1 = epoch({ startWeek: "2026-W30" });
    const e2 = epoch({ startWeek: "2026-W35" });
    expect(resolveEpoch([e2, e1], "2026-W30")).toBe(e1);
    expect(resolveEpoch([e2, e1], "2026-W34")).toBe(e1);
    expect(resolveEpoch([e2, e1], "2026-W35")).toBe(e2);
    expect(resolveEpoch([e2, e1], "2027-W01")).toBe(e2);
    expect(resolveEpoch([e2, e1], "2026-W29")).toBeNull();
  });
});

describe("baseAssignments", () => {
  it("is deterministic and covers every chore", () => {
    const a = baseAssignments(epoch(), "2026-W31");
    const b = baseAssignments(epoch(), "2026-W31");
    expect(a).toEqual(b);
    expect(a.map((x) => x.chore.id)).toEqual(CHORES.map((c) => c.id));
  });

  it("distributes chores equally when C is a multiple of N", () => {
    const a = baseAssignments(epoch(), "2026-W30");
    const counts = new Map<string, number>();
    for (const x of a) counts.set(x.assigneeUid, (counts.get(x.assigneeUid) ?? 0) + 1);
    expect([...counts.values()]).toEqual([2, 2, 2]);
  });

  it("rotates so everyone does every chore over N weeks", () => {
    const seen = new Map<string, Set<string>>(); // uid -> chore ids
    for (let w = 0; w < 3; w++) {
      for (const a of baseAssignments(epoch(), addWeeks("2026-W30", w))) {
        const set = seen.get(a.assigneeUid) ?? new Set();
        set.add(a.chore.id);
        seen.set(a.assigneeUid, set);
      }
    }
    for (const uid of ["alice", "bob", "carol"]) {
      expect(seen.get(uid)?.size).toBe(6);
    }
  });

  it("rotates the extra-chore burden when C is not a multiple of N (6 chores, 4 people)", () => {
    const e = epoch({ memberIds: ["a", "b", "c", "d"] });
    const totals = new Map<string, number>();
    for (let w = 0; w < 4; w++) {
      const week = addWeeks("2026-W30", w);
      const counts = new Map<string, number>();
      for (const x of baseAssignments(e, week)) {
        counts.set(x.assigneeUid, (counts.get(x.assigneeUid) ?? 0) + 1);
        totals.set(x.assigneeUid, (totals.get(x.assigneeUid) ?? 0) + 1);
      }
      // each week: two people do 2 chores, two do 1
      expect([...counts.values()].sort()).toEqual([1, 1, 2, 2]);
    }
    // over a full 4-week cycle everyone has done exactly 6
    expect([...totals.values()]).toEqual([6, 6, 6, 6]);
  });

  it("gives members weeks off when C < N (2 chores, 3 people) but stays fair over N weeks", () => {
    const e = epoch({ chores: CHORES.slice(0, 2) });
    const totals = new Map<string, number>();
    for (let w = 0; w < 3; w++) {
      for (const x of baseAssignments(e, addWeeks("2026-W30", w))) {
        totals.set(x.assigneeUid, (totals.get(x.assigneeUid) ?? 0) + 1);
      }
    }
    expect([...totals.values()]).toEqual([2, 2, 2]);
  });

  it("respects startOffset as the seed", () => {
    const a = baseAssignments(epoch({ startOffset: 0 }), "2026-W30");
    const b = baseAssignments(epoch({ startOffset: 1 }), "2026-W30");
    expect(a[0]!.assigneeUid).toBe("alice");
    expect(b[0]!.assigneeUid).toBe("bob");
  });
});

describe("parseEpochDoc", () => {
  it("keeps assignmentMode so the app and calendar sync agree", () => {
    const parsed = parseEpochDoc("2026-W30", {
      startWeek: "2026-W30",
      memberIds: ["alice", "bob"],
      chores: CHORES,
      startOffset: 2,
      assignmentMode: "wholeWeek",
    });
    expect(parsed.assignmentMode).toBe("wholeWeek");
    expect(baseAssignments(parsed, "2026-W30").every((a) => a.assigneeUid === "carol")).toBe(false);
    expect(new Set(baseAssignments(parsed, "2026-W30").map((a) => a.assigneeUid)).size).toBe(1);
  });

  it("falls back to the document id and safe defaults", () => {
    const parsed = parseEpochDoc("2026-W31", {});
    expect(parsed.startWeek).toBe("2026-W31");
    expect(parsed.memberIds).toEqual([]);
    expect(parsed.chores).toEqual([]);
    expect(parsed.startOffset).toBe(0);
    expect(parsed.assignmentMode).toBeUndefined();
  });
});

describe("wholeWeek mode", () => {
  const solo = () => epoch({ assignmentMode: "wholeWeek" as const });

  it("gives every chore that week to one person", () => {
    const a = baseAssignments(solo(), "2026-W30");
    expect(new Set(a.map((x) => x.assigneeUid)).size).toBe(1);
    expect(a).toHaveLength(CHORES.length);
  });

  it("rotates the duty week by week, equally over a full cycle", () => {
    const owners = [0, 1, 2, 3, 4, 5].map(
      (w) => baseAssignments(solo(), addWeeks("2026-W30", w))[0]!.assigneeUid,
    );
    expect(owners).toEqual(["alice", "bob", "carol", "alice", "bob", "carol"]);
  });

  it("leaves perChore epochs (and epochs written before the setting existed) untouched", () => {
    const before = baseAssignments(epoch(), "2026-W30");
    expect(new Set(before.map((x) => x.assigneeUid)).size).toBe(3);
    const explicit = baseAssignments(epoch({ assignmentMode: "perChore" }), "2026-W30");
    expect(explicit).toEqual(before);
  });

  it("swaps hand over the whole week to the other person", () => {
    const s = swap({ weekA: "2026-W30", memberA: "alice", weekB: "2026-W33", memberB: "bob" });
    const w = computeWeek({ epochs: [solo()], week: "2026-W30", swaps: [s] });
    expect(w.assignments.every((a) => a.assigneeUid === "bob")).toBe(true);
  });
});

describe("swaps", () => {
  it("swaps whole weeks in both directions", () => {
    const s = swap({});
    // weekA: alice's chores go to bob
    const wA = computeWeek({ epochs: [epoch()], week: "2026-W31", swaps: [s] });
    expect(wA.assignments.some((a) => a.assigneeUid === "alice")).toBe(false);
    expect(wA.assignments.filter((a) => a.swapped).every((a) => a.assigneeUid === "bob")).toBe(true);
    // weekB: bob's chores go to alice
    const wB = computeWeek({ epochs: [epoch()], week: "2026-W32", swaps: [s] });
    expect(wB.assignments.some((a) => a.assigneeUid === "bob")).toBe(false);
    // unrelated weeks untouched
    const wC = computeWeek({ epochs: [epoch()], week: "2026-W33", swaps: [s] });
    expect(wC.assignments.every((a) => !a.swapped)).toBe(true);
  });

  it("same-week swap is an exchange, not a chain", () => {
    const s = swap({ weekA: "2026-W31", weekB: "2026-W31", memberA: "alice", memberB: "bob" });
    const base = computeWeek({ epochs: [epoch()], week: "2026-W31" });
    const swapped = computeWeek({ epochs: [epoch()], week: "2026-W31", swaps: [s] });
    for (let i = 0; i < base.assignments.length; i++) {
      const before = base.assignments[i]!.assigneeUid;
      const after = swapped.assignments[i]!.assigneeUid;
      if (before === "alice") expect(after).toBe("bob");
      else if (before === "bob") expect(after).toBe("alice");
      else expect(after).toBe(before);
    }
  });

  it("chained swaps compose in createdAt order", () => {
    // swap1: alice's W31 load -> bob; swap2 (later): bob's W31 load -> carol
    const s1 = swap({ id: "s1", weekA: "2026-W31", memberA: "alice", weekB: "2026-W33", memberB: "bob", createdAtMillis: 1 });
    const s2 = swap({ id: "s2", weekA: "2026-W31", memberA: "bob", weekB: "2026-W34", memberB: "carol", createdAtMillis: 2 });
    const w = computeWeek({ epochs: [epoch()], week: "2026-W31", swaps: [s2, s1] });
    // alice's original chores went to bob (s1) and then to carol (s2)
    expect(w.assignments.some((a) => a.assigneeUid === "alice")).toBe(false);
    expect(w.assignments.some((a) => a.assigneeUid === "bob")).toBe(false);
    expect(w.assignments.every((a) => a.assigneeUid === "carol")).toBe(true);
  });
});

describe("overrides and completions", () => {
  it("override trumps base and swap", () => {
    const s = swap({ weekA: "2026-W31", memberA: "alice", weekB: "2026-W31", memberB: "bob" });
    const w = computeWeek({
      epochs: [epoch()],
      week: "2026-W31",
      swaps: [s],
      overrides: [{ week: "2026-W31", choreId: "mop", assigneeUid: "carol" }],
    });
    const mop = w.assignments.find((a) => a.chore.id === "mop")!;
    expect(mop.assigneeUid).toBe("carol");
    expect(mop.overridden).toBe(true);
  });

  it("attaches completions to the right chore", () => {
    const w = computeWeek({
      epochs: [epoch()],
      week: "2026-W30",
      completions: [{ week: "2026-W30", choreId: "stove", completedBy: "bob" }],
    });
    const stove = w.assignments.find((a) => a.chore.id === "stove")!;
    expect(stove.completion?.completedBy).toBe("bob");
    expect(stove.done).toBe(true);
    const mop = w.assignments.find((a) => a.chore.id === "mop")!;
    expect(mop.completion).toBeUndefined();
    expect(mop.done).toBe(false);
  });

  it("chores with sub-tasks are done only when every sub-task is ticked", () => {
    const bathroom = {
      id: "bathroom",
      name: "Clean the bathroom",
      subtasks: [
        { id: "toilet", name: "Clean toilet" },
        { id: "sink", name: "Clean sink" },
        { id: "bath", name: "Clean bath" },
      ],
    };
    const e = epoch({ chores: [bathroom, ...CHORES.slice(0, 2)] });
    const tick = (subtaskId: string) => ({
      week: "2026-W30",
      choreId: "bathroom",
      subtaskId,
      completedBy: "alice",
    });

    const partial = computeWeek({
      epochs: [e],
      week: "2026-W30",
      completions: [tick("toilet"), tick("sink")],
    });
    const partialBathroom = partial.assignments.find((a) => a.chore.id === "bathroom")!;
    expect(partialBathroom.done).toBe(false);
    expect(Object.keys(partialBathroom.subtaskCompletions).sort()).toEqual(["sink", "toilet"]);

    const full = computeWeek({
      epochs: [e],
      week: "2026-W30",
      completions: [tick("toilet"), tick("sink"), tick("bath")],
    });
    expect(full.assignments.find((a) => a.chore.id === "bathroom")!.done).toBe(true);
  });

  it("a whole-chore tick does not complete a chore that has sub-tasks", () => {
    const kitchen = {
      id: "kitchen",
      name: "Clean the kitchen",
      subtasks: [
        { id: "stove", name: "Clean stove top" },
        { id: "fridge", name: "Empty the fridge of expired food" },
      ],
    };
    const e = epoch({ chores: [kitchen] });
    const w = computeWeek({
      epochs: [e],
      week: "2026-W30",
      completions: [{ week: "2026-W30", choreId: "kitchen", completedBy: "alice" }],
    });
    expect(w.assignments[0]!.done).toBe(false);
  });

  it("groups byMember by final assignee", () => {
    const w = computeWeek({ epochs: [epoch()], week: "2026-W30" });
    expect([...w.byMember.keys()].sort()).toEqual(["alice", "bob", "carol"]);
    expect(w.byMember.get("alice")?.length).toBe(2);
  });
});

describe("epoch transitions", () => {
  it("continuedStartOffset preserves the rotation phase", () => {
    const e1 = epoch({ startWeek: "2026-W30", startOffset: 4 });
    const newStart = "2026-W36";
    const e2 = epoch({ startWeek: newStart, startOffset: continuedStartOffset(e1, newStart) });
    // If the config were unchanged, assignments must be identical at and after the boundary
    expect(baseAssignments(e2, "2026-W36")).toEqual(baseAssignments(e1, "2026-W36"));
    expect(baseAssignments(e2, "2026-W40")).toEqual(baseAssignments(e1, "2026-W40"));
  });

  it("past weeks resolve against the epoch active at the time", () => {
    const e1 = epoch({ startWeek: "2026-W30", chores: CHORES });
    const e2 = epoch({
      startWeek: "2026-W35",
      chores: [...CHORES, { id: "windows", name: "Clean windows" }],
      startOffset: continuedStartOffset(e1, "2026-W35"),
    });
    const past = computeWeek({ epochs: [e1, e2], week: "2026-W32" });
    const future = computeWeek({ epochs: [e1, e2], week: "2026-W36" });
    expect(past.assignments.length).toBe(6);
    expect(future.assignments.length).toBe(7);
  });

  it("nextEpochStartWeek is the following week", () => {
    expect(nextEpochStartWeek("2026-W30")).toBe("2026-W31");
    expect(nextEpochStartWeek("2020-W53")).toBe("2021-W01");
  });
});
