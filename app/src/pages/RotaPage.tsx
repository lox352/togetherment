import {
  addWeeks,
  choreWeekEndDate,
  choreWeekStartDate,
  computeWeek,
  currentWeekKey,
} from "@togetherment/shared";
import { useState } from "react";
import SwapDialog from "../components/SwapDialog";
import WeekChores from "../components/WeekChores";
import { useAuth } from "../contexts/AuthContext";
import { useRotaData } from "../hooks/useHouseholdData";
import { firstName, formatDay, memberMap } from "../lib/format";
import { deleteSwap } from "../lib/mutations";

export default function RotaPage() {
  const { user } = useAuth();
  const { epochs, swaps, overrides, completions, members, loading } = useRotaData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [swapOpen, setSwapOpen] = useState(false);

  if (loading) return <div className="page">Loading…</div>;

  const byUid = memberMap(members);
  const current = currentWeekKey();
  const weekKey = addWeeks(current, weekOffset);
  const week = computeWeek({ epochs: epochs!, week: weekKey, swaps, overrides, completions });

  const activeSwaps = (swaps ?? [])
    .filter((s) => s.weekA >= current || s.weekB >= current)
    .sort((a, b) => (a.weekA < b.weekA ? -1 : 1));

  return (
    <div className="page">
      <h1>Rota</h1>

      <div className="week-nav">
        <button className="btn btn-small" onClick={() => setWeekOffset((o) => o - 1)}>←</button>
        <div className="title">
          {weekOffset === 0 ? "This week" : weekOffset === 1 ? "Next week" : weekKey}
          <div className="muted">
            {formatDay(choreWeekStartDate(weekKey))} – {formatDay(choreWeekEndDate(weekKey))}
          </div>
        </div>
        <button className="btn btn-small" onClick={() => setWeekOffset((o) => o + 1)}>→</button>
      </div>
      {weekOffset !== 0 && (
        <p style={{ textAlign: "center" }}>
          <button className="btn btn-small" onClick={() => setWeekOffset(0)}>
            Back to this week
          </button>
        </p>
      )}

      <div className="card">
        <WeekChores week={week} members={byUid} ticksEnabled={weekOffset <= 0} />
      </div>

      {!swapOpen ? (
        <button className="btn btn-primary" onClick={() => setSwapOpen(true)}>
          Propose a swap
        </button>
      ) : (
        <SwapDialog members={members ?? []} onClose={() => setSwapOpen(false)} />
      )}

      {activeSwaps.length > 0 && (
        <>
          <h2>Upcoming swaps</h2>
          <div className="card">
            {activeSwaps.map((s) => (
              <div className="list-row" key={s.id}>
                <div className="grow">
                  {firstName(byUid.get(s.memberA), s.memberA)}'s {s.weekA} ↔{" "}
                  {firstName(byUid.get(s.memberB), s.memberB)}'s {s.weekB}
                  {s.note && <div className="muted">{s.note}</div>}
                </div>
                {user && (user.uid === s.memberA || user.uid === s.memberB) && (
                  <button className="btn btn-small btn-danger" onClick={() => void deleteSwap(s.id)}>
                    Undo
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
