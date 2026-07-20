import { climbingLine } from "../lib/charm";

/**
 * Loading state with stair-climbing flavour. It centres itself so the message
 * doesn't jump when one loading screen hands over to another.
 */
export default function Climbing() {
  return (
    <div className="loading-state">
      <p className="muted">{climbingLine()}</p>
    </div>
  );
}
