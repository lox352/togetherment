import type { Member } from "@togetherment/shared";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ONE_OFFS } from "../lib/charm";
import { firstName } from "../lib/format";
import { addActionItem } from "../lib/mutations";

/** Capture a one-off without leaving the page — the whole point of the card. */
export default function QuickAddOneOff({ members }: { members: Member[] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string | null>(user?.uid ?? null);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const active = members.filter((m) => m.active);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || !user) return;
    setSaving(true);
    await addActionItem({
      title: trimmed,
      assigneeUid: assignee ?? undefined,
      dueDate: dueDate || undefined,
      createdBy: user.uid,
    });
    setTitle("");
    setDueDate("");
    setSaving(false);
  };

  if (!open) {
    return (
      <button className="add-trigger" onClick={() => setOpen(true)}>
        {ONE_OFFS.addTrigger}
      </button>
    );
  }

  return (
    <form
      className="form-grid"
      style={{ marginTop: "0.6rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        type="text"
        autoFocus
        value={title}
        placeholder={ONE_OFFS.addPlaceholder}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="chip-row">
        {active.map((m) => (
          <button
            key={m.uid}
            type="button"
            className={`chip-choice ${assignee === m.uid ? "on" : ""}`}
            onClick={() => setAssignee(m.uid)}
          >
            {m.uid === user?.uid ? "Me" : firstName(m)}
          </button>
        ))}
        <button
          type="button"
          className={`chip-choice ${assignee === null ? "on" : ""}`}
          onClick={() => setAssignee(null)}
        >
          {ONE_OFFS.anyone}
        </button>
      </div>
      <div className="form-row">
        <label className="field">
          By when (optional)
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>
      <div className="form-row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setDueDate("");
          }}
        >
          Close
        </button>
        <button className="btn btn-primary" type="submit" disabled={!title.trim() || saving}>
          Add
        </button>
      </div>
    </form>
  );
}
