import { climbingLine } from "../lib/charm";

/** Loading state with stair-climbing flavour. */
export default function Climbing() {
  return <p className="muted">{climbingLine()}</p>;
}
