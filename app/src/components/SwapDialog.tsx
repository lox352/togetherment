import {
  addWeeks,
  choreWeekStartDate,
  currentWeekKey,
  type Member,
  type WeekKey,
} from "@togetherment/shared";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { firstName, formatDay } from "../lib/format";
import { createSwap } from "../lib/mutations";

interface Props {
  members: Member[];
  onClose: () => void;
}

/** Weeks offered for swapping: this week plus the next 11. */
function swapWeekOptions(): WeekKey[] {
  const current = currentWeekKey();
  return Array.from({ length: 12 }, (_, i) => addWeeks(current, i));
}

export default function SwapDialog({ members, onClose }: Props) {
  const { user } = useAuth();
  const weeks = swapWeekOptions();
  const others = members.filter((m) => m.active && m.uid !== user?.uid);

  const [weekA, setWeekA] = useState<WeekKey>(weeks[0]!);
  const [memberB, setMemberB] = useState(others[0]?.uid ?? "");
  const [weekB, setWeekB] = useState<WeekKey>(weeks[0]!);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user || !memberB) return;
    setSaving(true);
    setError("");
    try {
      await createSwap({
        weekA,
        memberA: user.uid,
        weekB,
        memberB,
        note: note.trim() || undefined,
        createdBy: user.uid,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Couldn't save the swap. Are you online?");
      setSaving(false);
    }
  };

  const weekLabel = (w: WeekKey) => `${w} (from ${formatDay(choreWeekStartDate(w))})`;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Swap chore weeks</h2>
      <p className="muted">
        They take over your chores in your week; you take over theirs in
        their week. Pick the same week for both to trade a single week's loads.
        Agree it in person first — saving here records it for everyone.
      </p>
      <div className="form-grid">
        <label className="field">
          My week
          <select value={weekA} onChange={(e) => setWeekA(e.target.value)}>
            {weeks.map((w) => (
              <option key={w} value={w}>{weekLabel(w)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Swap with
          <select value={memberB} onChange={(e) => setMemberB(e.target.value)}>
            {others.map((m) => (
              <option key={m.uid} value={m.uid}>{firstName(m)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Their week
          <select value={weekB} onChange={(e) => setWeekB(e.target.value)}>
            {weeks.map((w) => (
              <option key={w} value={w}>{weekLabel(w)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Note (optional)
          <input
            type="text"
            value={note}
            placeholder="e.g. I'm in Lisbon that week"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="form-row">
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void submit()} disabled={saving || !memberB}>
            {saving ? "Saving…" : "Save swap"}
          </button>
        </div>
      </div>
    </div>
  );
}
