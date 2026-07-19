import { useState } from "react";
import Avatar from "../components/Avatar";
import Climbing from "../components/Climbing";
import { useAuth } from "../contexts/AuthContext";
import { EMPTY } from "../lib/charm";
import { useActionItems, useMembers } from "../hooks/useHouseholdData";
import { firstName, formatDay, memberMap } from "../lib/format";
import { addActionItem, deleteActionItem, setActionItemStatus } from "../lib/mutations";

export default function ActionsPage() {
  const { user } = useAuth();
  const items = useActionItems();
  const members = useMembers();
  const byUid = memberMap(members);

  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  if (items === undefined || members === undefined) {
    return (
      <div className="page">
        <Climbing />
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.active);
  const open = items
    .filter((i) => i.status === "open")
    .sort((a, b) => (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1);
  const done = items
    .filter((i) => i.status === "done")
    .sort((a, b) => (b.completedAtMillis ?? 0) - (a.completedAtMillis ?? 0))
    .slice(0, 15);

  const add = async () => {
    if (!title.trim() || !user) return;
    await addActionItem({
      title: title.trim(),
      assigneeUid: assignee || user.uid,
      dueDate: dueDate || undefined,
      createdBy: user.uid,
    });
    setTitle("");
    setDueDate("");
  };

  return (
    <div className="page">
      <h1>Action items</h1>

      <div className="card form-grid">
        <input
          type="text"
          value={title}
          placeholder="e.g. Buy a side lamp for the living room"
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="form-row">
          <label className="field">
            Who
            <select value={assignee || user?.uid} onChange={(e) => setAssignee(e.target.value)}>
              {activeMembers.map((m) => (
                <option key={m.uid} value={m.uid}>{firstName(m)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            By when (optional)
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary" onClick={() => void add()} disabled={!title.trim()}>
          Add
        </button>
      </div>

      <div className="card">
        {open.length === 0 && <p className="muted">{EMPTY.actions}</p>}
        {open.map((i) => (
          <div className="list-row" key={i.id}>
            <button
              className="check"
              aria-label="Mark done"
              onClick={() => void setActionItemStatus(i.id, true)}
            >
              ✓
            </button>
            <div className="grow">
              {i.title}
              <div className="muted" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Avatar member={byUid.get(i.assigneeUid)} uid={i.assigneeUid} size="sm" />
                {firstName(byUid.get(i.assigneeUid), i.assigneeUid)}
                {i.dueDate ? ` · by ${formatDay(i.dueDate)}` : ""}
              </div>
            </div>
            <button className="btn btn-small btn-danger" onClick={() => void deleteActionItem(i.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <>
          <h2>Done</h2>
          <div className="card">
            {done.map((i) => (
              <div className="list-row" key={i.id}>
                <button
                  className="check check-done"
                  aria-label="Mark not done"
                  onClick={() => void setActionItemStatus(i.id, false)}
                >
                  ✓
                </button>
                <div className="grow">
                  <span className="strike">{i.title}</span>
                  <div className="muted">{firstName(byUid.get(i.assigneeUid), i.assigneeUid)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
