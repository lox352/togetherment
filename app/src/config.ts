/**
 * Set after running the one-time calendar setup script (sync/setup-calendar.ts):
 * paste the printed calendar ID here so Settings can show a subscribe link.
 * Leave empty to hide the calendar section.
 */
export const CALENDAR_ID =
  "2e4fb63d96f3bf9e04011f494076958a62c6d627f1ab01ab601ac1296fff2774@group.calendar.google.com";

/**
 * Apps Script webhook that triggers the calendar sync workflow immediately
 * after a change (see sync/apps-script/README.md). Leave empty to rely on the
 * nightly scheduled sync only.
 */
export const SYNC_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbyYZxie2m3DdLySbK96o1wmsRoQMi0v0ljFWcBw3qs9tBdM0YI6XsYpWbjkkzkN5jewBA/exec";
