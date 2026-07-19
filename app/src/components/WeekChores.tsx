import type { ChoreAssignment, Member, WeekAssignments } from "@togetherment/shared";
import { useAuth } from "../contexts/AuthContext";
import { choreEmoji, weekOffLine } from "../lib/charm";
import { firstName } from "../lib/format";
import { completeChore, uncompleteChore } from "../lib/mutations";
import Avatar from "./Avatar";

interface Props {
  week: WeekAssignments;
  members: Map<string, Member>;
  /** show tick buttons (current & past weeks) */
  ticksEnabled: boolean;
  /** if set, only show this member's chores */
  onlyUid?: string;
}

function DoneBy({
  completedBy,
  assigneeUid,
  members,
}: {
  completedBy: string;
  assigneeUid: string;
  members: Map<string, Member>;
}) {
  if (completedBy === assigneeUid) return null;
  return <span className="muted"> · done by {firstName(members.get(completedBy), completedBy)}</span>;
}

function AssignmentRows({
  a,
  week,
  members,
  ticksEnabled,
}: {
  a: ChoreAssignment;
  week: string;
  members: Map<string, Member>;
  ticksEnabled: boolean;
}) {
  const { user } = useAuth();
  const subtasks = a.chore.subtasks ?? [];

  if (subtasks.length === 0) {
    const done = a.done;
    return (
      <div className="list-row">
        {ticksEnabled && (
          <button
            className={`check ${done ? "check-done" : ""}`}
            aria-label={done ? "Mark not done" : "Mark done"}
            onClick={() =>
              done
                ? void uncompleteChore(week, a.chore.id)
                : void completeChore(week, a.chore.id, user!.uid, a.assigneeUid)
            }
          >
            ✓
          </button>
        )}
        <div className="grow">
          <span className={done ? "strike" : ""}>
            {choreEmoji(a.chore)} {a.chore.name}
          </span>
          {a.chore.description && <div className="muted">{a.chore.description}</div>}
          {a.completion && (
            <DoneBy
              completedBy={a.completion.completedBy}
              assigneeUid={a.assigneeUid}
              members={members}
            />
          )}
        </div>
        {a.swapped && <span className="badge badge-swap">swap</span>}
        {a.overridden && <span className="badge badge-swap">reassigned</span>}
      </div>
    );
  }

  // Chore with sub-tasks: the parent tick is derived, only sub-tasks are tappable.
  return (
    <div className="list-row subtask-group">
      {ticksEnabled && (
        <span
          className={`check check-derived ${a.done ? "check-done" : ""}`}
          aria-label={a.done ? "All sub-tasks done" : "Sub-tasks remaining"}
        >
          ✓
        </span>
      )}
      <div className="grow">
        <span className={a.done ? "strike" : ""}>
          {choreEmoji(a.chore)} {a.chore.name}
        </span>
        {a.chore.description && <div className="muted">{a.chore.description}</div>}
        <div className="subtasks">
          {subtasks.map((s) => {
            const tick = a.subtaskCompletions[s.id];
            return (
              <div className="subtask-row" key={s.id}>
                {ticksEnabled && (
                  <button
                    className={`check check-small ${tick ? "check-done" : ""}`}
                    aria-label={tick ? `Mark ${s.name} not done` : `Mark ${s.name} done`}
                    onClick={() =>
                      tick
                        ? void uncompleteChore(week, a.chore.id, s.id)
                        : void completeChore(week, a.chore.id, user!.uid, a.assigneeUid, s.id)
                    }
                  >
                    ✓
                  </button>
                )}
                <span className={tick ? "strike" : ""}>{s.name}</span>
                {tick && (
                  <DoneBy
                    completedBy={tick.completedBy}
                    assigneeUid={a.assigneeUid}
                    members={members}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {a.swapped && <span className="badge badge-swap">swap</span>}
      {a.overridden && <span className="badge badge-swap">reassigned</span>}
    </div>
  );
}

export default function WeekChores({ week, members, ticksEnabled, onlyUid }: Props) {
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
          {!onlyUid && (
            <div className="member-name">
              <Avatar member={members.get(uid)} uid={uid} size="sm" />
              {firstName(members.get(uid), uid)}
            </div>
          )}
          {(week.byMember.get(uid) ?? []).map((a) => (
            <AssignmentRows
              key={a.chore.id}
              a={a}
              week={week.week}
              members={members}
              ticksEnabled={ticksEnabled}
            />
          ))}
          {(week.byMember.get(uid) ?? []).length === 0 && (
            <p className="muted">{weekOffLine(week.week, uid)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
