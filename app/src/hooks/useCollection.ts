import {
  onSnapshot,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

/**
 * Subscribe to a Firestore query and map each doc through `convert`.
 * Returns undefined while the first snapshot is loading.
 *
 * `deps` controls resubscription (query object identity changes every render).
 */
export function useCollection<T>(
  makeQuery: () => Query<DocumentData>,
  convert: (snap: QueryDocumentSnapshot<DocumentData>) => T,
  deps: unknown[] = [],
): T[] | undefined {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const convertRef = useRef(convert);
  convertRef.current = convert;

  useEffect(() => {
    const unsubscribe = onSnapshot(
      makeQuery(),
      (snapshot) => {
        setData(snapshot.docs.map((d) => convertRef.current(d)));
      },
      (error) => {
        console.error("Firestore subscription error", error);
      },
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}
