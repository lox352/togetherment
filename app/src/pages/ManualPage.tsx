import type { ManualCategory, ManualEntry } from "@togetherment/shared";
import { useState } from "react";
import Climbing from "../components/Climbing";
import WifiQr from "../components/WifiQr";
import { useAuth } from "../contexts/AuthContext";
import { useManual, useMembers } from "../hooks/useHouseholdData";
import { firstName, memberMap } from "../lib/format";
import { deleteManualEntry, saveManualEntry, seedManual } from "../lib/mutations";
import { parseWifi } from "../lib/wifi";

const CATEGORIES: Array<{ id: ManualCategory; label: string }> = [
  { id: "wifi", label: "📶 Wifi" },
  { id: "building", label: "🏢 Building" },
  { id: "bins", label: "🗑️ Bins" },
  { id: "appliances", label: "🔧 Appliances" },
  { id: "contacts", label: "☎️ Contacts" },
  { id: "other", label: "✨ Other" },
];

const categoryLabel = (id: ManualCategory) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? "✨ Other";

interface EditorProps {
  entry?: ManualEntry;
  onDone: () => void;
}

function Editor({ entry, onDone }: EditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [category, setCategory] = useState<ManualCategory>(entry?.category ?? "other");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);
    await saveManualEntry(
      { id: entry?.id, title: title.trim(), body, category },
      user.uid,
    );
    setSaving(false);
    onDone();
  };

  return (
    <div className="form-grid">
      <input
        type="text"
        value={title}
        placeholder="e.g. Radiators"
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        rows={5}
        value={body}
        placeholder={"Anything worth knowing.\nFor wifi use:\nnetwork: …\npassword: …"}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="chip-row">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip-choice ${category === c.id ? "on" : ""}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="form-row">
        <button className="btn" onClick={onDone}>
          Cancel
        </button>
        {entry && (
          <button
            className="btn btn-danger"
            onClick={() => {
              void deleteManualEntry(entry.id);
              onDone();
            }}
          >
            Delete
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={() => void save()}
          disabled={!title.trim() || saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function ManualPage() {
  const { user } = useAuth();
  const entries = useManual();
  const members = useMembers();
  const byUid = memberMap(members);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);

  if (entries === undefined) return <Climbing />;

  const grouped = CATEGORIES.map((c) => ({
    ...c,
    items: entries
      .filter((e) => e.category === c.id)
      .sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="page">
      <h1>📖 House manual</h1>
      <p className="muted">
        How things work at 244 E 13 — so it isn't only in the head of whoever's
        lived here longest.
      </p>

      {entries.length === 0 && !adding && (
        <div className="card">
          <p className="muted">
            Nothing here yet. Start with the usual suspects and fill them in as you go.
          </p>
          <button
            className="btn btn-primary"
            disabled={seeding}
            onClick={() => {
              setSeeding(true);
              void seedManual(user!.uid).finally(() => setSeeding(false));
            }}
          >
            {seeding ? "Adding…" : "Start with the basics"}
          </button>
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.id}>
          <h2>{group.label}</h2>
          {group.items.map((entry) => {
            const wifi = entry.category === "wifi" ? parseWifi(entry.body) : null;
            return (
              <div className="card" key={entry.id}>
                {editing === entry.id ? (
                  <Editor entry={entry} onDone={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="list-row" style={{ borderBottom: "none", padding: 0 }}>
                      <div className="grow">
                        <strong>{entry.title}</strong>
                      </div>
                      <button className="btn btn-small" onClick={() => setEditing(entry.id)}>
                        Edit
                      </button>
                    </div>
                    {entry.body && <p className="manual-body">{entry.body}</p>}
                    {wifi && <WifiQr ssid={wifi.ssid} password={wifi.password} />}
                    {entry.updatedBy && (
                      <p className="muted">
                        updated by {firstName(byUid.get(entry.updatedBy), entry.updatedBy)}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <h2>Add an entry</h2>
      <div className="card">
        {adding ? (
          <Editor onDone={() => setAdding(false)} />
        ) : (
          <button className="add-trigger" onClick={() => setAdding(true)}>
            + Add to the manual
          </button>
        )}
      </div>

      <p className="muted">
        Everything here is readable by the three of us once signed in. Keep bank
        details and anything you'd mind leaking out of it.
      </p>
    </div>
  );
}
