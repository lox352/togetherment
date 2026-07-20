import {
  choreWeekStartDate,
  type AvailabilityEntry,
  type Gathering,
  type Member,
  type ShoppingItem,
  type WeekAssignments,
  type WeekKey,
} from "@togetherment/shared";
import { firstName, formatDay, formatRange } from "./format";

interface SummaryInput {
  week: WeekKey;
  assignments: WeekAssignments | false;
  members: Map<string, Member>;
  shopping: ShoppingItem[];
  availability: AvailabilityEntry[];
  gathering?: Gathering;
  today: string;
}

/**
 * Plain-text digest for the house WhatsApp group. WhatsApp itself can't be
 * automated (the official API can't post to groups), so this rides the native
 * share sheet instead.
 */
export function weekSummary({
  week,
  assignments,
  members,
  shopping,
  availability,
  gathering,
  today,
}: SummaryInput): string {
  const lines = [`244 E 13 · week of ${formatDay(choreWeekStartDate(week))}`];

  if (assignments && assignments.epoch) {
    const owners = [...assignments.byMember.keys()].map((uid) =>
      firstName(members.get(uid), uid),
    );
    if (owners.length > 0) lines.push(`🧹 Chores: ${owners.join(", ")}`);
  }

  const needed = shopping.filter((i) => i.status === "needed");
  if (needed.length > 0) {
    const names = needed
      .sort((a, b) => a.addedAtMillis - b.addedAtMillis)
      .map((i) => i.name);
    const shown = names.slice(0, 6).join(", ");
    lines.push(
      `🛒 Shopping (${names.length}): ${shown}${names.length > 6 ? "…" : ""}`,
    );
  }

  for (const a of availability
    .filter((a) => a.endDate >= today)
    .sort((x, y) => (x.startDate < y.startDate ? -1 : 1))
    .slice(0, 3)) {
    const who = firstName(members.get(a.memberUid), a.memberUid);
    lines.push(
      a.kind === "away"
        ? `✈️ ${who} away ${formatRange(a.startDate, a.endDate)}`
        : `🛏️ ${a.guestName ?? "Guest"} staying ${formatRange(a.startDate, a.endDate)} (${who})`,
    );
  }

  if (gathering) {
    lines.push(
      `${gathering.kind === "meal" ? "🍝" : "🎳"} ${gathering.title} ${formatDay(gathering.date)}${
        gathering.time ? ` · ${gathering.time}` : ""
      }`,
    );
  }

  lines.push("244e13.com");
  return lines.join("\n");
}

export type ShareResult = "shared" | "copied" | "failed";

export async function shareText(text: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (err) {
      // User dismissed the sheet — not an error worth reporting.
      if ((err as DOMException)?.name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
