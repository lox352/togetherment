/**
 * Household-wide constants shared by the app and the calendar sync script.
 *
 * HOUSEHOLD_TZ: the IANA timezone the apartment lives in. Week boundaries
 * (Monday 00:00) are always computed in this timezone, so a housemate
 * travelling abroad sees the same "current week" as everyone at home.
 */
export const HOUSEHOLD_TZ = "America/New_York"; // TODO: set to your apartment's timezone

/** Display name of the household, used in UI and calendar event titles. */
export const HOUSEHOLD_NAME = "Togetherment";

/**
 * When the chore week starts, in days relative to the ISO Monday.
 * -3 = Friday–Thursday blocks: the week kicks off going into the weekend
 * (when people have time for chores) and the weekdays are the tail.
 * 0 = plain ISO Monday–Sunday weeks.
 *
 * Blocks stay keyed by their ISO week ("2026-W30" = Fri 17 Jul – Thu 23 Jul
 * when this is -3), so changing this constant shifts boundaries without
 * invalidating stored swaps or completions.
 */
export const CHORE_WEEK_START_OFFSET_DAYS = -3;
