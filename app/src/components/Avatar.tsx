import type { Member } from "@togetherment/shared";
import { memberColor } from "../lib/charm";

interface Props {
  member: Member | undefined;
  uid: string;
  size?: "sm" | "md";
}

/** Round chip with the member's chosen emoji (or their initial) on their colour. */
export default function Avatar({ member, uid, size = "md" }: Props) {
  const color = memberColor(member, uid);
  const content = member?.emoji ?? (member?.displayName?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={`avatar ${size === "sm" ? "avatar-sm" : ""}`}
      style={{
        background: `color-mix(in srgb, ${color} 18%, var(--card))`,
        borderColor: `color-mix(in srgb, ${color} 45%, var(--card))`,
        color,
      }}
      aria-hidden="true"
    >
      {content}
    </span>
  );
}
