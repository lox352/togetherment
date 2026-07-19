import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAvailability, useMembers } from "../hooks/useHouseholdData";
import { firstName, formatRange, memberMap, todayDateString } from "../lib/format";
import { addAvailability, deleteAvailability } from "../lib/mutations";

export default function AvailabilityPage() {
  const { user } = useAuth();
  const entries = useAvailability();
  const members = useMembers();
  const byUid = memberMap(members);

  const [kind, setKind] = useState<"away" | "guest">("away");
  const [memberUid, setMemberUid] = useState("");
  const [guestName, setGuestName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (entries === undefined || members === undefined) {
    return <div className="page">Loading…</div>;
  }

  const today = todayDateString();
  const activeMembers = members.filter((m) => m.active);
  const upcoming = entries
    .filter((e) => e.endDate >= today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  const add = async () => {
    setError("");
    if (!startDate || !endDate) return setError("Pick both dates.");
    if (endDate < startDate) return setError("End date is before start date.");
    if (kind === "guest" && !guestName.trim()) return setError("Who's the guest?");
    await addAvailability({
      kind,
      memberUid: memberUid || user!.uid,
      guestName: kind === "guest" ? guestName.trim() : undefined,
      startDate,
      endDate,
      note: note.trim() || undefined,
      createdBy: user!.uid,
    });
    setGuestName("");
    setStartDate("");
    setEndDate("");
    setNote("");
  };

  return (
    <div className="page">
      <h1>Away & guests</h1>

      <div className="card form-grid">
        <div className="segment">
          <button className={kind === "away" ? "on" : ""} onClick={() => setKind("away")}>
            I'm away
          </button>
          <button className={kind === "guest" ? "on" : ""} onClick={() => setKind("guest")}>
            Guest staying
          </button>
        </div>
        <div className="form-row">
          <label className="field">
            {kind === "away" ? "Who's away" : "Who's hosting"}
            <select value={memberUid || user?.uid} onChange={(e) => setMemberUid(e.target.value)}>
              {activeMembers.map((m) => (
                <option key={m.uid} value={m.uid}>{firstName(m)}</option>
              ))}
            </select>
          </label>
          {kind === "guest" && (
            <label className="field">
              Guest name
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </label>
          )}
        </div>
        <div className="form-row">
          <label className="field">
            From
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field">
            Until (inclusive)
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <label className="field">
          Note (optional)
          <input
            type="text"
            value={note}
            placeholder="e.g. work trip to Berlin"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" onClick={() => void add()}>
          Add
        </button>
      </div>

      <div className="card">
        {upcoming.length === 0 && <p className="muted">Nothing planned — full house.</p>}
        {upcoming.map((e) => (
          <div className="list-row" key={e.id}>
            <span className={`badge ${e.kind === "away" ? "badge-away" : "badge-guest"}`}>
              {e.kind}
            </span>
            <div className="grow">
              {e.kind === "away"
                ? firstName(byUid.get(e.memberUid), e.memberUid)
                : `${e.guestName} (hosted by ${firstName(byUid.get(e.memberUid), e.memberUid)})`}
              <div className="muted">
                {formatRange(e.startDate, e.endDate)}
                {e.note ? ` · ${e.note}` : ""}
              </div>
            </div>
            <button className="btn btn-small btn-danger" onClick={() => void deleteAvailability(e.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
