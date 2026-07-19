import { SYNC_WEBHOOK_URL } from "../config";

/**
 * Fire-and-forget ping to the Apps Script webhook, which dispatches the
 * calendar sync workflow on GitHub. The response is opaque (no-cors — Apps
 * Script can't answer CORS preflights), so "sent" is the only signal;
 * the nightly scheduled sync is the safety net if a ping is lost.
 */
function ping(): void {
  void fetch(SYNC_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    // text/plain keeps this a "simple request" — no preflight.
    headers: { "Content-Type": "text/plain" },
    body: "sync",
  }).catch(() => {
    // Offline or blocked: the nightly sync will catch up.
  });
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

/** Debounced trigger, called after calendar-relevant Firestore writes. */
export function requestCalendarSync(): void {
  if (!SYNC_WEBHOOK_URL) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(ping, 4000);
}

/** Immediate trigger for the Settings "Sync now" button. */
export function requestCalendarSyncNow(): void {
  if (!SYNC_WEBHOOK_URL) return;
  clearTimeout(debounceTimer);
  ping();
}

export const syncWebhookConfigured = SYNC_WEBHOOK_URL !== "";
