/**
 * One-time setup: creates the shared "Togetherment" calendar OWNED BY THE
 * SERVICE ACCOUNT and grants each housemate read access. Run locally:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json \
 *     npm run setup-calendar --workspace=sync -- alice@gmail.com bob@gmail.com
 *
 * Then:
 *  1. Set the printed calendar ID as the CALENDAR_ID repo variable on GitHub.
 *  2. Paste it into app/src/config.ts so Settings shows the subscribe link.
 *  3. Each housemate adds it in Google Calendar: Settings → Add calendar →
 *     Subscribe to calendar → paste the calendar ID.
 */
import { HOUSEHOLD_NAME, HOUSEHOLD_TZ } from "@togetherment/shared";
import { google } from "googleapis";

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.error("Usage: setup-calendar <housemate-email> [more emails...]");
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  const calendar = google.calendar({ version: "v3", auth });

  const created = await calendar.calendars.insert({
    requestBody: { summary: HOUSEHOLD_NAME, timeZone: HOUSEHOLD_TZ },
  });
  const calendarId = created.data.id!;
  console.log(`Created calendar: ${calendarId}`);

  for (const email of emails) {
    await calendar.acl.insert({
      calendarId,
      requestBody: { role: "reader", scope: { type: "user", value: email } },
    });
    console.log(`Granted read access to ${email}`);
  }

  console.log("\nNext steps:");
  console.log(`  1. GitHub repo → Settings → Variables → CALENDAR_ID = ${calendarId}`);
  console.log("  2. Paste the ID into app/src/config.ts (CALENDAR_ID)");
  console.log("  3. Housemates: Google Calendar → Add calendar → Subscribe → paste the ID");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
