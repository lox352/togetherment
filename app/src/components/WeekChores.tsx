import type { Member, WeekAssignments } from "@togetherment/shared";
import { useAuth } from "../contexts/AuthContext";
import { firstName } from "../lib/format";
import { completeChore, uncompleteChore } from "../lib/mutations";

interface Props {
  week: WeekAssignments;
  members: Map<string, Member>;
  /** show tick buttons (current & past weeks) */
  ticksEnabled: boolean;
  /** if set, only show this member's chores */
  onlyUid?: string;
}

export default function WeekChores({ week, members, ticksEnabled, onlyUid }: Props) {
  const { user } = useAuth();

  if (!week.epoch) {
    return <p className="muted">No rota configured for this week.</p>;
  }

  const uids = onlyUid
    ? [onlyUid]
    : week.epoch.memberIds.filter((uid) => week.byMember.has(uid));

  return (
    <div>
      {uids.map((uid) => (
        <div className="member-block" key={uid}>
          {!onlyUid && <div className="member-name">{firstName(members.get(uid), uid)}</div>}
          {(week.byMember.get(uid) ?? []).map((a) => {
            const done = !!a.completion;
            return (
              <div className="list-row" key={a.chore.id}>
                {ticksEnabled && (
                  <button
                    className={`check ${done ? "check-done" : ""}`}
                    aria-label={done ? "Mark not done" : "Mark done"}
                    onClick={() =>
                      done
                        ? void uncompleteChore(week.week, a.chore.id)
                        : void completeChore(week.week, a.chore.id, user!.uid, a.assigneeUid)
                    }
                  >
                    ✓
                  </button>
                )}
                <div className="grow">
                  <span className={done ? "strike" : ""}>{a.chore.name}</span>
                  {a.chore.description && <div className="muted">{a.chore.description}</div>}
                  {done && a.completion!.completedBy !== a.assigneeUid && (
                    <div className="muted">
                      done by {firstName(members.get(a.completion!.completedBy), a.completion!.completedBy)}
                    </div>
                  )}
                </div>
                {a.swapped && <span className="badge badge-swap">swap</span>}
                {a.overridden && <span className="badge badge-swap">reassigned</span>}
              </div>
            );
          })}
          {(week.byMember.get(uid) ?? []).length === 0 && (
            <p className="muted">Week off 🎉</p>
          )}
        </div>
      ))}
    </div>
  );
}
