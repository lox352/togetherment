import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth, db, googleProvider } from "../firebase";

interface AuthState {
  /** undefined = still resolving, null = signed out */
  user: User | null | undefined;
  /** true when signed in but not on the household allowlist */
  denied: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setDenied(false);
      if (!u) return;
      try {
        // Upsert own member profile; doubles as the allowlist check —
        // a non-member's write is rejected by the security rules.
        await setDoc(
          doc(db, "members", u.uid),
          {
            displayName: u.displayName ?? u.email ?? "Unknown",
            email: u.email,
            photoURL: u.photoURL ?? null,
            active: true,
            lastSeenAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (err) {
        if ((err as { code?: string }).code === "permission-denied") {
          setDenied(true);
        } else {
          console.error("Failed to upsert member profile", err);
        }
      }
    });
  }, []);

  const signIn = useCallback(async () => {
    // Popup, not redirect: redirect sign-in breaks on non-firebaseapp.com
    // domains (like GitHub Pages) under third-party storage partitioning.
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, denied, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
