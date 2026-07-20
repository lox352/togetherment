/**
 * Syncs Firestore state to the shared Google Calendar. Idempotent: safe to run
 * as often as you like (a daily GitHub Action + manual dispatch).
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS (service account key file),
 *      FIREBASE_PROJECT_ID, CALENDAR_ID.
 */
import {
  addWeeks,
  choreEmoji,
  choreWeekStartDate,
  computeWeek,
  currentWeekKey,
  dateStringInTz,
  HOUSEHOLD_TZ,
  type AvailabilityEntry,
  type Gathering,
  type Member,
  type OverrideSpec,
  type RotaEpoch,
  type SwapSpec,
} from "@togetherment/shared";
import { createHash } from "node:crypto";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { google, type calendar_v3 } from "googleapis";

const CHORE_WEEKS_BACK = 1;
const CHORE_WEEKS_AHEAD = 8;
const LOOKAHEAD_DAYS = 183; // ~6 months for availability & gatherings

interface DesiredEvent {
  id: string;
  summary: string;
  description?: string;
  start: calendar_v3.Schema$EventDateTime;
  end: calendar_v3.Schema$EventDateTime;
}

/** Google event IDs must be base32hex; a hex sha1 qualifies. */
function eventId(key: string): string {
  return createHash("sha1").update(key).digest("hex");
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

function firstName(members: Map<string, Member>, uid: string): string {
  const m = members.get(uid);
  return m ? (m.displayName.split(" ")[0] ?? m.displayName) : uid.slice(0, 6);
}

async function loadFirestore() {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  const db = getFirestore();

  const [epochsSnap, swapsSnap, overridesSnap, membersSnap, availabilitySnap, gatheringsSnap] =
    await Promise.all([
      db.collection("rotaEpochs").get(),
      db.collection("swaps").get(),
      db.collection("overrides").get(),
      db.collection("members").get(),
      db.collection("availability").get(),
      db.collection("gatherings").get(),
    ]);

  const epochs: RotaEpoch[] = epochsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      startWeek: d.startWeek ?? doc.id,
      memberIds: d.memberIds ?? [],
      chores: d.chores ?? [],
      startOffset: d.startOffset ?? 0,
    };
  });
  const swaps: SwapSpec[] = swapsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      weekA: d.weekA,
      memberA: d.memberA,
      weekB: d.weekB,
      memberB: d.memberB,
      createdAtMillis: d.createdAt ? (d.createdAt as Timestamp).toMillis() : 0,
    };
  });
  const overrides: OverrideSpec[] = overridesSnap.docs.map((doc) => {
    const d = doc.data();
    return { week: d.week, choreId: d.choreId, assigneeUid: d.assigneeUid };
  });
  const members = new Map<string, Member>(
    membersSnap.docs.map((doc) => {
      const d = doc.data();
      return [
        doc.id,
        {
          uid: doc.id,
          displayName: d.displayName ?? "Unknown",
          email: d.email ?? "",
          active: d.active !== false,
        },
      ];
    }),
  );
  const availability: AvailabilityEntry[] = availabilitySnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      kind: d.kind,
      memberUid: d.memberUid,
      guestName: d.guestName ?? undefined,
      startDate: d.startDate,
      endDate: d.endDate,
      note: d.note ?? undefined,
      createdBy: d.createdBy,
    };
  });
  const gatherings: Gathering[] = gatheringsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title,
      date: d.date,
      time: d.time ?? undefined,
      kind: d.kind ?? "meal",
      description: d.description ?? undefined,
      proposedBy: d.proposedBy,
      rsvps: d.rsvps ?? {},
    };
  });

  return { epochs, swaps, overrides, members, availability, gatherings };
}

function buildDesiredEvents(data: Awaited<ReturnType<typeof loadFirestore>>): DesiredEvent[] {
  const { epochs, swaps, overrides, members, availability, gatherings } = data;
  const events: DesiredEvent[] = [];
  const today = dateStringInTz(new Date());
  const horizon = addDays(today, LOOKAHEAD_DAYS);

  // Chore assignments: one all-day event per (member, week) spanning the
  // encouraged window — Friday through Monday (end.date is exclusive).
  const startWeek = addWeeks(currentWeekKey(), -CHORE_WEEKS_BACK);
  for (let i = 0; i <= CHORE_WEEKS_BACK + CHORE_WEEKS_AHEAD; i++) {
    const week = addWeeks(startWeek, i);
    const computed = computeWeek({ epochs, week, swaps, overrides });
    if (!computed.epoch) continue;
    const blockStart = choreWeekStartDate(week);
    for (const [uid, assignments] of computed.byMember) {
      const choreNames = assignments.map((a) => a.chore.name);
      const swapped = assignments.some((a) => a.swapped || a.overridden);
      events.push({
        id: eventId(`chore|${week}|${uid}`),
        summary: `🧹 Chores: ${firstName(members, uid)} — ${choreNames.join(", ")}`,
        description: [
          `Chore week ${week} (Fri–Thu)${swapped ? " — includes swapped chores" : ""}`,
          "Aim to be done by Monday night.",
          ...assignments.flatMap((a) => [
            `${choreEmoji(a.chore)} ${a.chore.name}${a.chore.description ? `: ${a.chore.description}` : ""}`,
            ...(a.chore.subtasks ?? []).map((s) => `    – ${s.name}`),
          ]),
        ].join("\n"),
        start: { date: blockStart },
        end: { date: addDays(blockStart, 4) },
      });
    }
  }

  // Away periods & guest stays (all-day spans; Google end.date is exclusive).
  for (const a of availability) {
    if (a.endDate < today || a.startDate > horizon) continue;
    const summary =
      a.kind === "away"
        ? `✈️ Away: ${firstName(members, a.memberUid)}`
        : `🛏️ Guest: ${a.guestName ?? "Guest"} (hosting: ${firstName(members, a.memberUid)})`;
    events.push({
      id: eventId(`avail|${a.id}`),
      summary,
      ...(a.note ? { description: a.note } : {}),
      start: { date: a.startDate },
      end: { date: addDays(a.endDate, 1) },
    });
  }

  // Gatherings: timed (2h) when a time is set, otherwise all-day.
  for (const g of gatherings) {
    if (g.date < today || g.date > horizon) continue;
    const base = {
      id: eventId(`gath|${g.id}`),
      summary: `${g.kind === "meal" ? "🍝" : "🎳"} House ${g.kind}: ${g.title}`,
      ...(g.description ? { description: g.description } : {}),
    };
    if (g.time) {
      const start = `${g.date}T${g.time}:00`;
      const [h, min] = g.time.split(":").map(Number);
      const endH = String(Math.min((h ?? 0) + 2, 23)).padStart(2, "0");
      const end = `${g.date}T${endH}:${String(min ?? 0).padStart(2, "0")}:00`;
      events.push({
        ...base,
        start: { dateTime: start, timeZone: HOUSEHOLD_TZ },
        end: { dateTime: end, timeZone: HOUSEHOLD_TZ },
      });
    } else {
      events.push({ ...base, start: { date: g.date }, end: { date: addDays(g.date, 1) } });
    }
  }

  return events;
}

function sameEvent(desired: DesiredEvent, existing: calendar_v3.Schema$Event): boolean {
  return (
    existing.status === "confirmed" &&
    existing.summary === desired.summary &&
    (existing.description ?? undefined) === desired.description &&
    (existing.start?.date ?? undefined) === desired.start.date &&
    (existing.end?.date ?? undefined) === desired.end.date &&
    (existing.start?.dateTime ?? undefined) === desired.start.dateTime &&
    (existing.end?.dateTime ?? undefined) === desired.end.dateTime
  );
}

async function main() {
  const calendarId = process.env.CALENDAR_ID;
  if (!calendarId) throw new Error("CALENDAR_ID env var is required");

  const data = await loadFirestore();
  const desired = buildDesiredEvents(data);
  const desiredById = new Map(desired.map((e) => [e.id, e]));

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  const calendar = google.calendar({ version: "v3", auth });

  // Everything currently on the calendar in a wide window. This calendar is
  // owned solely by the service account (housemates have reader access), so
  // the sync is the only writer and anything it doesn't want is stale — no
  // tag filter, which would leave untagged strays orphaned forever.
  const existing = new Map<string, calendar_v3.Schema$Event>();
  let pageToken: string | undefined;
  const timeMin = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const timeMax = new Date(Date.now() + (LOOKAHEAD_DAYS + 365) * 86_400_000).toISOString();
  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults: 2500,
      singleEvents: false,
      showDeleted: false,
      pageToken,
    });
    for (const ev of res.data.items ?? []) {
      if (ev.id) existing.set(ev.id, ev);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let deleted = 0;

  for (const event of desired) {
    const requestBody: calendar_v3.Schema$Event = {
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      status: "confirmed",
      transparency: "transparent", // don't block anyone's free/busy
      extendedProperties: { private: { togetherment: "1" } },
    };
    const current = existing.get(event.id);
    if (current && sameEvent(event, current)) {
      unchanged++;
      continue;
    }
    if (current) {
      await calendar.events.update({ calendarId, eventId: event.id, requestBody });
      updated++;
      continue;
    }
    try {
      await calendar.events.insert({ calendarId, requestBody });
      inserted++;
    } catch (err) {
      const code = (err as { code?: number }).code;
      // 409/410: this ID existed before (possibly deleted/tombstoned) —
      // update resurrects it with status confirmed.
      if (code === 409 || code === 410) {
        await calendar.events.update({ calendarId, eventId: event.id, requestBody });
        updated++;
      } else {
        throw err;
      }
    }
  }

  let deleteFailures = 0;
  for (const [id, ev] of existing) {
    if (desiredById.has(id) || ev.status === "cancelled") continue;
    try {
      await calendar.events.delete({ calendarId, eventId: id });
      deleted++;
    } catch (err) {
      const code = (err as { code?: number }).code;
      // 404/410: already gone. Anything else: report it but keep pruning —
      // one bad event must not strand every later deletion.
      if (code !== 404 && code !== 410) {
        deleteFailures++;
        console.warn(`Could not delete "${ev.summary ?? id}": ${String(err)}`);
      }
    }
  }

  console.log(
    `Sync complete: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged, ` +
      `${deleted} deleted, ${existing.size} were on the calendar, ${desired.length} desired.` +
      (deleteFailures ? ` ${deleteFailures} deletions failed.` : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
