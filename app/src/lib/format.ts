import { dateStringInTz, type Member } from "@togetherment/shared";

export function firstName(member: Member | undefined, uid?: string): string {
  if (!member) return uid ? uid.slice(0, 6) : "Someone";
  return member.displayName.split(" ")[0] ?? member.displayName;
}

export function memberMap(members: Member[] | undefined): Map<string, Member> {
  return new Map((members ?? []).map((m) => [m.uid, m]));
}

/** "Mon 20 Jul" from "2026-07-20" (parsed as a plain date, no timezone shift). */
export function formatDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatRange(start: string, end: string): string {
  return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}

/** Today as "YYYY-MM-DD" in the household timezone. */
export function todayDateString(): string {
  return dateStringInTz(new Date());
}
