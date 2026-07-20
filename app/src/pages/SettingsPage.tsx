import {
  choreWeekStartDate,
  continuedStartOffset,
  currentWeekKey,
  nextEpochStartWeek,
  resolveEpoch,
  type AssignmentMode,
  type Chore,
  type RotaEpoch,
} from "@togetherment/shared";
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import Climbing from "../components/Climbing";
import { CALENDAR_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useEpochs, useMembers } from "../hooks/useHouseholdData";
import { COLOR_PRESETS, EMOJI_PRESETS } from "../lib/charm";
import { firstName, formatDay } from "../lib/format";
import { saveEpoch, updateMyStyle } from "../lib/mutations";
import { requestCalendarSyncNow, syncWebhookConfigured } from "../lib/triggerSync";

const DEFAULT_CHORES: Chore[] = [
  { id: "mop", name: "Mop everywhere" },
  { id: "vacuum", name: "Vacuum everywhere" },
  { id: "dust", name: "Dust and clean surfaces", description: "Including the desk and window sills" },
  {
    id: "bathroom",
    name: "Clean the bathroom",
    subtasks: [
      { id: "toilet", name: "Clean toilet" },
      { id: "sink", name: "Clean sink" },
      { id: "bath", name: "Clean bath" },
    ],
  },
  {
    id: "kitchen",
    name: "Clean the kitchen",
    subtasks: [
      { id: "stove", name: "Clean stove top" },
      { id: "sink", name: "Clean sink" },
      { id: "fridge", name: "Empty the fridge of expired food" },
    ],
  },
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
  const [mode, setMode] = useState<AssignmentMode>("wholeWeek");
  const [newChore, setNewChore] = useState("");
  const [newSubs, setNewSubs] = useState<Record<string, string>>({});
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
    setMode(source?.assignmentMode ?? "wholeWeek");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading || chores === null || memberOrder === null) {
    return (
      <div className="page">
        <Climbing />
      </div>
    );
  }

  const byUid = new Map(members!.map((m) => [m.uid, m]));
  const myProfile = user ? byUid.get(user.uid) : undefined;
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

  const updateChore = (index: number, patch: Partial<Chore>) => {
    setChores(chores.map((c, j) => (j === index ? { ...c, ...patch } : c)));
  };

  const addSubtask = (index: number) => {
    const chore = chores[index]!;
    const name = (newSubs[chore.id] ?? "").trim();
    if (!name) return;
    const taken = new Set((chore.subtasks ?? []).map((s) => s.id));
    updateChore(index, {
      subtasks: [...(chore.subtasks ?? []), { id: slugify(name, taken), name }],
    });
    setNewSubs({ ...newSubs, [chore.id]: "" });
  };

  const save = async () => {
    setStatus("saving");
    try {
      const epoch: RotaEpoch = {
        startWeek: targetWeek,
        memberIds: memberOrder,
        chores,
        startOffset: currentEpoch ? continuedStartOffset(currentEpoch, targetWeek) : 0,
        assignmentMode: mode,
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
          <div className="list-row subtask-group" key={c.id}>
            <div className="grow">
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateChore(i, { name: e.target.value })}
              />
              {c.description && <div className="muted">{c.description}</div>}
              <div className="subtasks">
                {(c.subtasks ?? []).map((s, si) => (
                  <div className="subtask-row" key={s.id}>
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) =>
                        updateChore(i, {
                          subtasks: c.subtasks!.map((x, sj) =>
                            sj === si ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() =>
                        updateChore(i, {
                          subtasks: c.subtasks!.filter((_, sj) => sj !== si),
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="subtask-row">
                  <input
                    type="text"
                    value={newSubs[c.id] ?? ""}
                    placeholder="Add a sub-task…"
                    onChange={(e) => setNewSubs({ ...newSubs, [c.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubtask(i);
                      }
                    }}
                  />
                  <button
                    className="btn btn-small"
                    onClick={() => addSubtask(i)}
                    disabled={!(newSubs[c.id] ?? "").trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
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

      <h2>How chores are shared</h2>
      <div className="card">
        <div className="segment">
          <button
            className={mode === "wholeWeek" ? "on" : ""}
            onClick={() => setMode("wholeWeek")}
          >
            One person a week
          </button>
          <button
            className={mode === "perChore" ? "on" : ""}
            onClick={() => setMode("perChore")}
          >
            Split every week
          </button>
        </div>
        <p className="muted">
          {mode === "wholeWeek"
            ? "One housemate does every chore that week, then it passes to the next person."
            : "Chores are divided between everyone each week."}
        </p>
      </div>

      <h2>Rotation order</h2>
      <div className="card">
        {memberOrder.map((uid, i) => (
          <div className="list-row" key={uid}>
            <Avatar member={byUid.get(uid)} uid={uid} size="sm" />
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

      <h2>My style</h2>
      <div className="card">
        <p className="muted">Pick your emoji and colour — they show up next to your name everywhere.</p>
        <div className="chip-row">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              className={`chip ${myProfile?.emoji === e ? "on" : ""}`}
              onClick={() => void updateMyStyle(user!.uid, { emoji: e })}
              aria-label={`Use ${e} as my emoji`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              className={`chip ${myProfile?.color === c ? "on" : ""}`}
              style={{ background: c }}
              onClick={() => void updateMyStyle(user!.uid, { color: c })}
              aria-label="Use this colour"
            />
          ))}
        </div>
      </div>

      <h2>Account</h2>
      <div className="card">
        <div className="list-row">
          <Avatar member={myProfile} uid={user?.uid ?? ""} />
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
