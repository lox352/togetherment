import Climbing from "../components/Climbing";
import QuickAddShopping from "../components/QuickAddShopping";
import ShoppingSection from "../components/ShoppingSection";
import { useAuth } from "../contexts/AuthContext";
import { useMembers, useShoppingItems } from "../hooks/useHouseholdData";
import { firstName, memberMap } from "../lib/format";
import { markNeededAgain } from "../lib/mutations";

const THIRTY_DAYS_MS = 30 * 86_400_000;

export default function ShoppingPage() {
  const { user } = useAuth();
  const items = useShoppingItems();
  const members = useMembers();
  const byUid = memberMap(members);

  if (items === undefined) {
    return (
      <div className="page">
        <Climbing />
      </div>
    );
  }

  const needed = items.filter((i) => i.status === "needed");
  const recentlyBought = items
    .filter(
      (i) => i.status === "bought" && (i.boughtAtMillis ?? 0) > Date.now() - THIRTY_DAYS_MS,
    )
    .sort((a, b) => (b.boughtAtMillis ?? 0) - (a.boughtAtMillis ?? 0));

  return (
    <div className="page">
      <h1>Shopping</h1>

      <div className="card">
        <ShoppingSection items={items} members={byUid} detailed />
        <QuickAddShopping listSize={needed.length} />
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
                <button
                  className="btn btn-small"
                  onClick={() => void markNeededAgain(i.id, user!.uid)}
                >
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
