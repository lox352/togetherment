/** Keyword → emoji for chores (English + Italian friendly). Shared so the app
 * and the calendar sync decorate chores identically. */
const CHORE_EMOJI: Array<[RegExp, string]> = [
  [/bathroom|bagno|toilet|bath/, "🛁"],
  [/kitchen|cucina|stove|fornell/, "🍳"],
  [/fridge|frigo/, "🧊"],
  [/mop|mocio/, "🪣"],
  [/vacuum|hoover|aspira/, "🌀"],
  [/dust|polvere|surface/, "🪶"],
  [/sink|lavandino/, "🚰"],
  [/bin|trash|rubbish|spazzatura/, "🗑️"],
  [/window|finestr/, "🪟"],
  [/laundry|bucato/, "🧺"],
  [/plant|piant/, "🪴"],
  [/floor|paviment/, "🧹"],
];

export function choreEmoji(chore: { id: string; name: string }): string {
  const haystack = `${chore.id} ${chore.name}`.toLowerCase();
  for (const [pattern, emoji] of CHORE_EMOJI) {
    if (pattern.test(haystack)) return emoji;
  }
  return "✨";
}
