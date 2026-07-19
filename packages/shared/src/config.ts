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
