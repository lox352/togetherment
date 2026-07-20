import type { Member, ShoppingItem } from "@togetherment/shared";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { EMPTY, HOUSE, climbLine } from "../lib/charm";
import { firstName } from "../lib/format";
import { deleteShoppingItem, markBought, markNeededAgain } from "../lib/mutations";

/** How long a ticked item lingers, struck through, so it can be undone. */
const GRACE_MS = 2500;

interface Props {
  items: ShoppingItem[];
  members?: Map<string, Member>;
  /** Cap the visible rows and link to the full list (Dashboard). */
  limit?: number;
  /** Show who added each item and a delete button (Shopping tab). */
  detailed?: boolean;
}

export default function ShoppingSection({ items, members, limit, detailed = false }: Props) {
  const { user } = useAuth();
  // Ticked items hang around briefly instead of vanishing, so a mistap is recoverable.
  const [justBought, setJustBought] = useState<string[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const needed = items
    .filter((i) => i.status === "needed")
    .sort((a, b) => a.addedAtMillis - b.addedAtMillis); // oldest first: don't let the tail rot

  const lingering = items.filter((i) => justBought.includes(i.id) && i.status === "bought");
  const ordered = [...needed, ...lingering].sort(
    (a, b) => a.addedAtMillis - b.addedAtMillis,
  );
  const visible = limit ? ordered.slice(0, limit) : ordered;
  const hidden = ordered.length - visible.length;

  const buy = (item: ShoppingItem) => {
    void markBought(item.id, user!.uid);
    setJustBought((ids) => [...ids, item.id]);
    const timer = setTimeout(() => {
      setJustBought((ids) => ids.filter((id) => id !== item.id));
      timers.current.delete(item.id);
    }, GRACE_MS);
    timers.current.set(item.id, timer);
  };

  const undo = (item: ShoppingItem) => {
    const timer = timers.current.get(item.id);
    if (timer) clearTimeout(timer);
    timers.current.delete(item.id);
    setJustBought((ids) => ids.filter((id) => id !== item.id));
    void markNeededAgain(item.id, user!.uid);
  };

  const climb = climbLine(needed.length);

  return (
    <>
      {ordered.length === 0 && <p className="muted">{EMPTY.shopping}</p>}

      {visible.map((item) => {
        const bought = item.status === "bought";
        return (
          <div className="list-row" key={item.id}>
            <button
              className={`check ${bought ? "check-done" : ""}`}
              aria-label={bought ? "Undo" : `Mark ${item.name} bought`}
              onClick={() => (bought ? undo(item) : buy(item))}
            >
              ✓
            </button>
            <div className="grow">
              <span className={bought ? "strike" : ""}>{item.name}</span>
              {item.note && <span className="muted"> · {item.note}</span>}
              {bought ? (
                <div className="muted">
                  {HOUSE.bought} ·{" "}
                  <button className="link-button" onClick={() => undo(item)}>
                    {HOUSE.undo}
                  </button>
                </div>
              ) : (
                detailed && (
                  <div className="muted">
                    added by {firstName(members?.get(item.addedBy), item.addedBy)}
                  </div>
                )
              )}
            </div>
            {detailed && !bought && (
              <button
                className="btn btn-small btn-danger"
                onClick={() => void deleteShoppingItem(item.id)}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      {hidden > 0 && (
        <p className="muted" style={{ paddingTop: "0.5rem" }}>
          <Link to="/shopping">+{hidden} more →</Link>
        </p>
      )}
      {climb && <p className="muted">{climb}</p>}
    </>
  );
}
