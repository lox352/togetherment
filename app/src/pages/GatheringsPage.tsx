import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGatherings, useMembers } from "../hooks/useHouseholdData";
import { firstName, formatDay, memberMap, todayDateString } from "../lib/format";
import { addGathering, deleteGathering, setRsvp } from "../lib/mutations";

const RSVP_OPTIONS = ["yes", "maybe", "no"] as const;

export default function GatheringsPage() {
  const { user } = useAuth();
  const gatherings = useGatherings();
  const members = useMembers();
  const byUid = memberMap(members);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState<"meal" | "activity">("meal");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  if (gatherings === undefined || members === undefined) {
    return <div className="page">Loading…</div>;
  }

  const today = todayDateString();
  const upcoming = gatherings
    .filter((g) => g.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const past = gatherings
    .filter((g) => g.date < today)
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .slice(0, 5);

  const add = async () => {
    setError("");
    if (!title.trim()) return setError("Give it a name.");
    if (!date) return setError("Pick a date.");
    await addGathering({
      title: title.trim(),
      date,
      time: time || undefined,
      kind,
      description: description.trim() || undefined,
      proposedBy: user!.uid,
    });
    setTitle("");
    setDate("");
    setTime("");
    setDescription("");
    setFormOpen(false);
  };

  return (
    <div className="page">
      <h1>Gatherings</h1>
      <p className="muted">House meals and outings — aim for one a month or so.</p>

      {!formOpen ? (
        <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
          Propose a gathering
        </button>
      ) : (
        <div className="card form-grid">
          <input
            type="text"
            value={title}
            placeholder="e.g. House dinner, bouldering trip…"
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="segment">
            <button className={kind === "meal" ? "on" : ""} onClick={() => setKind("meal")}>
              Meal
            </button>
            <button className={kind === "activity" ? "on" : ""} onClick={() => setKind("activity")}>
              Activity
            </button>
          </div>
          <div className="form-row">
            <label className="field">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              Time (optional)
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <input
            type="text"
            value={description}
            placeholder="Details (optional)"
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <p className="error-text">{error}</p>}
          <div className="form-row">
            <button className="btn" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => void add()}>Save</button>
          </div>
        </div>
      )}

      <h2>Upcoming</h2>
      {upcoming.length === 0 && (
        <div className="card"><p className="muted">Nothing planned yet.</p></div>
      )}
      {upcoming.map((g) => (
        <div className="card" key={g.id}>
          <div className="list-row" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <div className="grow">
              <strong>{g.title}</strong>
              <div className="muted">
                {formatDay(g.date)}
                {g.time ? ` · ${g.time}` : ""} · {g.kind} · proposed by{" "}
                {firstName(byUid.get(g.proposedBy), g.proposedBy)}
              </div>
              {g.description && <div className="muted">{g.description}</div>}
            </div>
            {user?.uid === g.proposedBy && (
              <button className="btn btn-small btn-danger" onClick={() => void deleteGathering(g.id)}>
                ✕
              </button>
            )}
          </div>
          <div className="segment" style={{ margin: "0.6rem 0" }}>
            {RSVP_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={g.rsvps[user!.uid] === opt ? "on" : ""}
                onClick={() => void setRsvp(g.id, user!.uid, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="muted">
            {members
              .filter((m) => m.active && g.rsvps[m.uid])
              .map((m) => `${firstName(m)}: ${g.rsvps[m.uid]}`)
              .join(" · ") || "No RSVPs yet"}
          </div>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <h2>Past</h2>
          <div className="card">
            {past.map((g) => (
              <div className="list-row" key={g.id}>
                <div className="grow">
                  {g.title}
                  <div className="muted">{formatDay(g.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
