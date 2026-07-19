import {
  choreWeekStartDate,
  continuedStartOffset,
  currentWeekKey,
  nextEpochStartWeek,
  resolveEpoch,
  type Chore,
  type RotaEpoch,
} from "@togetherment/shared";
import { useEffect, useState } from "react";
import { CALENDAR_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useEpochs, useMembers } from "../hooks/useHouseholdData";
import { firstName, formatDay } from "../lib/format";
import { saveEpoch } from "../lib/mutations";
import { requestCalendarSyncNow, syncWebhookConfigured } from "../lib/triggerSync";

const DEFAULT_CHORES: Chore[] = [
  { id: "mop", name: "Mop everywhere" },
  { id: "vacuum", name: "Vacuum everywhere" },
  { id: "dust", name: "Dust and clean surfaces", description: "Including the desk and window sills" },
  { id: "bathroom", name: "Clean the toilet, sink and bath" },
  { id: "stove", name: "Clean the stove" },
  { id: "fridge", name: "Check the fridge", description: "Throw away mouldy things" },
];

function slugify(name: string, taken: Set<string>): string {
  const base =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chore";
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const epochs = useEpochs();
  const members = useMembers();

  const [chores, setChores] = useState<Chore[] | null>(null);
  const [memberOrder, setMemberOrder] = useState<string[] | null>(null);
  const [newChore, setNewChore] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [syncRequested, setSyncRequested] = useState(false);

  const loading = epochs === undefined || members === undefined;
  const currentWeek = currentWeekKey();
  const currentEpoch = loading ? null : resolveEpoch(epochs!, currentWeek);
  // First-ever epoch starts this week (usable immediately); later changes
  // take effect from the next chore week so nobody's week changes underneath them.
  const isFirstEpoch = !loading && epochs!.length === 0;
  const targetWeek = isFirstEpoch ? currentWeek : nextEpochStartWeek(currentWeek);
  const pendingEpoch = loading
    ? null
    : (epochs!.find((e) => e.startWeek === targetWeek) ?? null);

  // Initialise the editor once data arrives: pending edit > current config > defaults.
  useEffect(() => {
    if (loading || chores !== null) return;
    const source = pendingEpoch ?? currentEpoch;
    setChores(source ? source.chores : DEFAULT_CHORES);
    setMemberOrder(
      source
        ? source.memberIds
        : members!.filter((m) => m.active).map((m) => m.uid),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading || chores === null || memberOrder === null) {
    return <div className="page">Loading…</div>;
  }

  const byUid = new Map(members!.map((m) => [m.uid, m]));
  const inRota = new Set(memberOrder);
  const notInRota = members!.filter((m) => m.active && !inRota.has(m.uid));

  const move = (index: number, delta: number) => {
    const next = [...memberOrder];
    const j = index + delta;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setMemberOrder(next);
  };

  const addChore = () => {
    const name = newChore.trim();
    if (!name) return;
    const taken = new Set(chores.map((c) => c.id));
    setChores([...chores, { id: slugify(name, taken), name }]);
    setNewChore("");
  };

  const save = async () => {
    setStatus("saving");
    try {
      const epoch: RotaEpoch = {
        startWeek: targetWeek,
        memberIds: memberOrder,
        chores,
        startOffset: currentEpoch ? continuedStartOffset(currentEpoch, targetWeek) : 0,
      };
      await saveEpoch(epoch, user!.uid);
      setStatus("saved");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const canSave = chores.length > 0 && memberOrder.length > 0 && status !== "saving";

  return (
    <div className="page">
      <h1>Settings</h1>

      <h2>Chores</h2>
      <div className="card">
        {chores.map((c, i) => (
          <div className="list-row" key={c.id}>
            <div className="grow">
              <input
                type="text"
                value={c.name}
                onChange={(e) =>
                  setChores(chores.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
              {c.description && <div className="muted">{c.description}</div>}
            </div>
            <button
              className="btn btn-small btn-danger"
              onClick={() => setChores(chores.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <form
          className="inline-form"
          style={{ marginTop: "0.6rem", marginBottom: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            addChore();
          }}
        >
          <input
            type="text"
            value={newChore}
            placeholder="Add a chore…"
            onChange={(e) => setNewChore(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!newChore.trim()}>
            Add
          </button>
        </form>
      </div>

      <h2>Rotation order</h2>
      <div className="card">
        {memberOrder.map((uid, i) => (
          <div className="list-row" key={uid}>
            <div className="grow">{firstName(byUid.get(uid), uid)}</div>
            <button className="btn btn-small" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button
              className="btn btn-small"
              onClick={() => move(i, 1)}
              disabled={i === memberOrder.length - 1}
            >
              ↓
            </button>
            <button
              className="btn btn-small btn-danger"
              onClick={() => setMemberOrder(memberOrder.filter((u) => u !== uid))}
            >
              ✕
            </button>
          </div>
        ))}
        {notInRota.map((m) => (
          <div className="list-row" key={m.uid}>
            <div className="grow muted">{firstName(m)} (not in rota)</div>
            <button
              className="btn btn-small"
              onClick={() => setMemberOrder([...memberOrder, m.uid])}
            >
              Add
            </button>
          </div>
        ))}
        {memberOrder.length === 0 && (
          <p className="error-text">The rota needs at least one person.</p>
        )}
      </div>

      <div className="card">
        <p className="muted">
          {isFirstEpoch
            ? `This sets up the rota starting this week (from ${formatDay(choreWeekStartDate(targetWeek))}).`
            : `Changes take effect from ${formatDay(choreWeekStartDate(targetWeek))}. This week's assignments stay as they are.`}
          {pendingEpoch && " A pending change for that week already exists and will be replaced."}
        </p>
        <button className="btn btn-primary" onClick={() => void save()} disabled={!canSave}>
          {status === "saving" ? "Saving…" : "Save rota config"}
        </button>
        {status === "saved" && <p className="muted">Saved ✓</p>}
        {status === "error" && (
          <p className="error-text">
            Couldn't save. If the change was for a week that has now started, reload and try again.
          </p>
        )}
      </div>

      {CALENDAR_ID && (
        <>
          <h2>Shared calendar</h2>
          <div className="card">
            <p className="muted">
              Subscribe in Google Calendar: Settings → Add calendar → Subscribe to
              calendar → paste this ID:
            </p>
            <p style={{ wordBreak: "break-all" }}>
              <code>{CALENDAR_ID}</code>
            </p>
            {syncWebhookConfigured && (
              <>
                <p className="muted">
                  The calendar updates automatically a minute or two after rota,
                  travel or gathering changes, and every night as a backstop.
                </p>
                <button
                  className="btn"
                  onClick={() => {
                    requestCalendarSyncNow();
                    setSyncRequested(true);
                  }}
                >
                  Sync calendar now
                </button>
                {syncRequested && (
                  <p className="muted">Requested — give it a minute or two.</p>
                )}
              </>
            )}
          </div>
        </>
      )}

      <h2>Account</h2>
      <div className="card">
        <div className="list-row">
          <div className="grow">
            {user?.displayName}
            <div className="muted">{user?.email}</div>
          </div>
          <button className="btn" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
