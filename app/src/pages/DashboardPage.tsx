import {
  computeWeek,
  currentWeekKey,
  mondayOfWeek,
  sundayOfWeek,
} from "@togetherment/shared";
import { Link } from "react-router-dom";
import WeekChores from "../components/WeekChores";
import { useAuth } from "../contexts/AuthContext";
import {
  useActionItems,
  useAvailability,
  useGatherings,
  useRotaData,
} from "../hooks/useHouseholdData";
import { firstName, formatDay, formatRange, memberMap, todayDateString } from "../lib/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const { epochs, swaps, overrides, completions, members, loading } = useRotaData();
  const availability = useAvailability();
  const gatherings = useGatherings();
  const actionItems = useActionItems();

  const weekKey = currentWeekKey();
  const byUid = memberMap(members);
  const today = todayDateString();

  const week =
    !loading &&
    computeWeek({ epochs: epochs!, week: weekKey, swaps, overrides, completions });

  const myChores = week && user ? (week.byMember.get(user.uid) ?? []) : [];
  const presentNow = (availability ?? []).filter(
    (a) => a.startDate <= today && today <= a.endDate,
  );
  const upcomingAway = (availability ?? [])
    .filter((a) => a.startDate > today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
    .slice(0, 3);
  const nextGathering = (gatherings ?? [])
    .filter((g) => g.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const myActions = (actionItems ?? []).filter(
    (a) => a.status === "open" && a.assigneeUid === user?.uid,
  );

  if (loading) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <h1>
        This week{" "}
        <span className="muted">
          {formatDay(mondayOfWeek(weekKey))} – {formatDay(sundayOfWeek(weekKey))}
        </span>
      </h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>My chores</h2>
        {!week || !week.epoch ? (
          <p className="muted">
            No rota yet — set up chores in <Link to="/settings">Settings</Link>.
          </p>
        ) : myChores.length === 0 ? (
          <p className="muted">Nothing this week 🎉</p>
        ) : (
          <WeekChores week={week} members={byUid} ticksEnabled onlyUid={user!.uid} />
        )}
      </div>

      {week && week.epoch && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Everyone</h2>
          <WeekChores week={week} members={byUid} ticksEnabled />
          <Link to="/rota" className="muted">
            Full rota & swaps →
          </Link>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Who's around</h2>
        {presentNow.length === 0 && upcomingAway.length === 0 && (
          <p className="muted">Everyone's home, no guests.</p>
        )}
        {presentNow.map((a) => (
          <div className="list-row" key={a.id}>
            <div className="grow">
              {a.kind === "away"
                ? `${firstName(byUid.get(a.memberUid), a.memberUid)} is away`
                : `${a.guestName ?? "A guest"} is staying (${firstName(byUid.get(a.memberUid), a.memberUid)})`}
              <div className="muted">until {formatDay(a.endDate)}</div>
            </div>
            <span className={`badge ${a.kind === "away" ? "badge-away" : "badge-guest"}`}>
              {a.kind}
            </span>
          </div>
        ))}
        {upcomingAway.map((a) => (
          <div className="list-row" key={a.id}>
            <div className="grow">
              {a.kind === "away"
                ? `${firstName(byUid.get(a.memberUid), a.memberUid)} away`
                : `${a.guestName ?? "Guest"} staying`}
              <div className="muted">{formatRange(a.startDate, a.endDate)}</div>
            </div>
          </div>
        ))}
      </div>

      {nextGathering && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Next gathering</h2>
          <div className="list-row">
            <div className="grow">
              {nextGathering.title}
              <div className="muted">
                {formatDay(nextGathering.date)}
                {nextGathering.time ? ` · ${nextGathering.time}` : ""}
              </div>
            </div>
            <Link to="/gatherings" className="btn btn-small">RSVP</Link>
          </div>
        </div>
      )}

      {myActions.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>My action items</h2>
          {myActions.map((a) => (
            <div className="list-row" key={a.id}>
              <div className="grow">
                {a.title}
                {a.dueDate && <div className="muted">by {formatDay(a.dueDate)}</div>}
              </div>
            </div>
          ))}
          <Link to="/actions" className="muted">All action items →</Link>
        </div>
      )}
    </div>
  );
}
