import { useState } from "react";
import Climbing from "../components/Climbing";
import { useAuth } from "../contexts/AuthContext";
import { EMPTY } from "../lib/charm";
import { useMembers, useShoppingItems } from "../hooks/useHouseholdData";
import { firstName, memberMap } from "../lib/format";
import {
  addShoppingItem,
  deleteShoppingItem,
  markBought,
  markNeededAgain,
} from "../lib/mutations";

const THIRTY_DAYS_MS = 30 * 86_400_000;

export default function ShoppingPage() {
  const { user } = useAuth();
  const items = useShoppingItems();
  const members = useMembers();
  const byUid = memberMap(members);
  const [name, setName] = useState("");

  if (items === undefined) {
    return (
      <div className="page">
        <Climbing />
      </div>
    );
  }

  const needed = items
    .filter((i) => i.status === "needed")
    .sort((a, b) => a.addedAtMillis - b.addedAtMillis);
  const recentlyBought = items
    .filter(
      (i) =>
        i.status === "bought" &&
        (i.boughtAtMillis ?? 0) > Date.now() - THIRTY_DAYS_MS,
    )
    .sort((a, b) => (b.boughtAtMillis ?? 0) - (a.boughtAtMillis ?? 0));

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user) return;
    setName("");
    await addShoppingItem(trimmed, user.uid);
  };

  return (
    <div className="page">
      <h1>Shopping</h1>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          type="text"
          value={name}
          placeholder="We're running low on…"
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
          Add
        </button>
      </form>

      <div className="card">
        {needed.length === 0 && <p className="muted">{EMPTY.shopping}</p>}
        {needed.map((i) => (
          <div className="list-row" key={i.id}>
            <button
              className="check"
              aria-label="Mark bought"
              onClick={() => void markBought(i.id, user!.uid)}
            >
              ✓
            </button>
            <div className="grow">
              {i.name}
              <div className="muted">added by {firstName(byUid.get(i.addedBy), i.addedBy)}</div>
            </div>
            <button className="btn btn-small btn-danger" onClick={() => void deleteShoppingItem(i.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {recentlyBought.length > 0 && (
        <>
          <h2>Recently bought</h2>
          <div className="card">
            {recentlyBought.map((i) => (
              <div className="list-row" key={i.id}>
                <div className="grow">
                  <span className="strike">{i.name}</span>
                  <div className="muted">
                    bought by {firstName(byUid.get(i.boughtBy ?? ""), i.boughtBy)}
                  </div>
                </div>
                <button className="btn btn-small" onClick={() => void markNeededAgain(i.id, user!.uid)}>
                  Need again
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
