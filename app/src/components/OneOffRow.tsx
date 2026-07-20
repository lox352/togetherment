import type { Member } from "@togetherment/shared";
import { ONE_OFFS } from "../lib/charm";
import { firstName, formatDay } from "../lib/format";
import { claimActionItem, deleteActionItem, setActionItemStatus } from "../lib/mutations";
import type { OneOffView } from "../lib/oneOffs";
import Avatar from "./Avatar";

interface Props {
  view: OneOffView;
  members: Map<string, Member>;
  currentUid: string;
  /** Show who it's for (used outside "my" lists). */
  showAssignee?: boolean;
  /** Offer the claim button instead of a tick (up-for-grabs list). */
  claimable?: boolean;
  deletable?: boolean;
}

export default function OneOffRow({
  view,
  members,
  currentUid,
  showAssignee = false,
  claimable = false,
  deletable = false,
}: Props) {
  const { item, overdue, dueThisWeek, gatheringDust } = view;
  const done = item.status === "done";

  return (
    <div className="list-row">
      {claimable ? (
        <span className="check check-derived" aria-hidden="true">
          ✓
        </span>
      ) : (
        <button
          className={`check ${done ? "check-done" : ""}`}
          aria-label={done ? "Mark not done" : "Mark done"}
          onClick={() => void setActionItemStatus(item.id, !done)}
        >
          ✓
        </button>
      )}

      <div className="grow">
        <span className={done ? "strike" : ""}>{item.title}</span>
        <div className="muted meta-line">
          {showAssignee && item.assigneeUid && (
            <>
              <Avatar member={members.get(item.assigneeUid)} uid={item.assigneeUid} size="sm" />
              {firstName(members.get(item.assigneeUid), item.assigneeUid)}
            </>
          )}
          {item.dueDate && <span>by {formatDay(item.dueDate)}</span>}
          {overdue && <span className="badge badge-overdue">overdue</span>}
          {dueThisWeek && <span className="badge">this week</span>}
          {gatheringDust && item.createdAtMillis > 0 && (
            <span>
              🕸️ gathering dust since{" "}
              {formatDay(new Date(item.createdAtMillis).toISOString().slice(0, 10))}
            </span>
          )}
          {!showAssignee && item.createdBy !== currentUid && (
            <span>added by {firstName(members.get(item.createdBy), item.createdBy)}</span>
          )}
        </div>
      </div>

      {claimable && (
        <button
          className="btn btn-small"
          onClick={() => void claimActionItem(item.id, currentUid)}
        >
          {ONE_OFFS.claim}
        </button>
      )}
      {deletable && (
        <button className="btn btn-small btn-danger" onClick={() => void deleteActionItem(item.id)}>
          ✕
        </button>
      )}
    </div>
  );
}
