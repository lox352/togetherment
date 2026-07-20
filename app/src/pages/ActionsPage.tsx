import Avatar from "../components/Avatar";
import Climbing from "../components/Climbing";
import OneOffRow from "../components/OneOffRow";
import QuickAddOneOff from "../components/QuickAddOneOff";
import { useAuth } from "../contexts/AuthContext";
import { useActionItems, useMembers } from "../hooks/useHouseholdData";
import { EMPTY, ONE_OFFS } from "../lib/charm";
import { firstName, memberMap } from "../lib/format";
import { setActionItemStatus } from "../lib/mutations";
import { mine, openOneOffs, sortOneOffs, unassigned } from "../lib/oneOffs";

export default function ActionsPage() {
  const { user } = useAuth();
  const items = useActionItems();
  const members = useMembers();
  const byUid = memberMap(members);

  if (items === undefined || members === undefined) {
    return (
      <div className="page">
        <Climbing />
      </div>
    );
  }

  const open = openOneOffs(items);
  const grabbable = sortOneOffs(unassigned(open));
  const done = items
    .filter((i) => i.status === "done")
    .sort((a, b) => (b.completedAtMillis ?? 0) - (a.completedAtMillis ?? 0))
    .slice(0, 15);

  // Everyone with something open, current user first.
  const owners = members
    .filter((m) => m.active && mine(open, m.uid).length > 0)
    .sort((a, b) => (a.uid === user?.uid ? -1 : b.uid === user?.uid ? 1 : 0));

  return (
    <div className="page">
      <h1>📌 One-offs</h1>
      <p className="muted">
        Things to do once — not the weekly chores. If it fits in a supermarket basket,
        it probably belongs in Shopping instead.
      </p>

      <div className="card">
        <QuickAddOneOff members={members} />
      </div>

      {grabbable.length > 0 && (
        <>
          <h2>{ONE_OFFS.grabsTitle}</h2>
          <div className="card">
            <p className="muted">{ONE_OFFS.grabsBlurb}</p>
            {grabbable.map((v) => (
              <OneOffRow
                key={v.item.id}
                view={v}
                members={byUid}
                currentUid={user!.uid}
                claimable
                deletable
              />
            ))}
          </div>
        </>
      )}

      {open.length === 0 && (
        <div className="card">
          <p className="muted">{EMPTY.actions}</p>
        </div>
      )}

      {owners.map((m) => (
        <div key={m.uid}>
          <h2>
            {m.uid === user?.uid ? "Mine" : firstName(m)}
          </h2>
          <div className="card">
            {sortOneOffs(mine(open, m.uid)).map((v) => (
              <OneOffRow
                key={v.item.id}
                view={v}
                members={byUid}
                currentUid={user!.uid}
                deletable
              />
            ))}
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <>
          <h2>{ONE_OFFS.archive}</h2>
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
                  {i.assigneeUid && (
                    <div className="muted meta-line">
                      <Avatar member={byUid.get(i.assigneeUid)} uid={i.assigneeUid} size="sm" />
                      {firstName(byUid.get(i.assigneeUid), i.assigneeUid)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
