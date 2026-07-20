/**
 * The personality of 244 E 13: a 6th-floor Manhattan walk-up shared by an
 * American, an Italian and a Brit. All strings and pickers are deterministic
 * so everyone sees the same joke on the same day.
 */
import type { Member } from "@togetherment/shared";

export function charmHash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// --- greetings (language rotates daily: 🇬🇧 → 🇮🇹 → 🇺🇸) ---

const GREETINGS = {
  morning: ["Morning, {n} ☕", "Buongiorno, {n} ☀️", "Mornin', {n} 🥯"],
  afternoon: ["Afternoon, {n} 👋", "Buon pomeriggio, {n} 🍋", "Hey there, {n} 🌇"],
  evening: ["Evening, {n} 🌙", "Buonasera, {n} 🍝", "Evenin', {n} 🌃"],
} as const;

export function greeting(name: string, now: Date = new Date()): string {
  const h = now.getHours();
  const bucket = h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : "evening";
  const dayOfYear = Math.floor(
    (now.getTime() - Date.UTC(now.getFullYear(), 0, 0)) / 86_400_000,
  );
  return GREETINGS[bucket][dayOfYear % 3]!.replace("{n}", name);
}

// --- weekly tagline (same all week for everyone) ---

const TAGLINES = [
  "Three nations, one bathroom.",
  "Six floors closer to heaven.",
  "No lift. No excuses.",
  "La dolce vita, sixth-floor edition.",
  "One small flat, three great powers.",
  "Il dolce far niente ends Friday.",
  "An Englishman, an American and an Italian share a broom…",
  "Keep calm and mop on.",
  "East 13th's finest cleaning crew.",
  "Home is where the rota is.",
  "Est. somewhere between London, Rome & the East Village.",
  "The least special relationship: chores.",
];

export function weeklyTagline(weekKey: string): string {
  return TAGLINES[charmHash(weekKey) % TAGLINES.length]!;
}

// --- loading lines ---

const CLIMBING = [
  "Climbing six flights… 🥾",
  "Salendo sei piani… 🛵",
  "Six floors, no lift… 🚶",
  "Catching our breath on floor four…",
];

export function climbingLine(now: Date = new Date()): string {
  return CLIMBING[now.getMinutes() % CLIMBING.length]!;
}

// --- empty states & celebrations ---

export const EMPTY = {
  shopping: "Cupboards full, fridge happy. 🧀",
  actions: "Nothing on the list. Il dolce far niente. 🛋️",
  oneOffs: "Nothing on your plate. Il dolce far niente. 🛋️",
  myWeek: "Clean slate. Enjoy the view. 🌇",
  availability: "Full house — everyone home, six floors up. 🏠",
  gatherings: "Nothing planned. Someone say aperitivo? 🥂",
} as const;

export const ONE_OFFS = {
  cardTitle: "My week",
  choresHead: "🧹 Chores this week",
  oneOffsHead: "📌 One-offs",
  addTrigger: "+ Add a one-off",
  addPlaceholder: "e.g. buy a side lamp for the living room",
  anyone: "Anyone 🙋",
  grabsTitle: "Up for grabs 🙋",
  grabsBlurb: "No owner yet. Be a hero.",
  claim: "I'll do it 🙋",
  archive: "Recently sorted ✅",
} as const;

const WEEK_OFF = [
  "Week off 🎉",
  "Niente! Enjoy 🍕",
  "Scot-free this week 🫖",
  "You're off the hook 🎣",
];

export function weekOffLine(weekKey: string, uid: string): string {
  return WEEK_OFF[charmHash(weekKey + uid) % WEEK_OFF.length]!;
}

export const CELEBRATION = {
  headline: "Fatto! Done! Sorted! 🎉",
  sub: "The sixth floor sparkles ✨",
} as const;

export const RSVP_LABELS = { yes: "I'm in 🙋", maybe: "Maybe 🤷", no: "Can't 😢" } as const;

// Chore emoji lives in @togetherment/shared (the calendar sync uses it too).
export { choreEmoji } from "@togetherment/shared";

// --- member style (emoji + colour, picked in Settings) ---

export const EMOJI_PRESETS = ["🇬🇧", "🇺🇸", "🇮🇹", "☕", "🍕", "🥯", "🗽", "🛵", "🧹", "🎸", "🎩", "🐈"];

export const COLOR_PRESETS = [
  "#a2402e", // brick
  "#46604a", // fire-escape iron
  "#3b5273", // dusk blue
  "#a8762a", // mustard
  "#6d4260", // plum
  "#2f6a66", // teal
  "#8a4b2f", // terracotta
  "#55606e", // slate
];

export function memberColor(member: Member | undefined, uid: string): string {
  if (member?.color) return member.color;
  return COLOR_PRESETS[charmHash(uid) % COLOR_PRESETS.length]!;
}

export function memberBadge(member: Member | undefined): string | null {
  return member?.emoji ?? null;
}
