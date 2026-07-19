import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ActionsPage from "./pages/ActionsPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import DashboardPage from "./pages/DashboardPage";
import GatheringsPage from "./pages/GatheringsPage";
import RotaPage from "./pages/RotaPage";
import SettingsPage from "./pages/SettingsPage";
import ShoppingPage from "./pages/ShoppingPage";

const TABS = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/rota", label: "Rota", icon: "🧹" },
  { to: "/shopping", label: "Shopping", icon: "🛒" },
  { to: "/availability", label: "Away", icon: "✈️" },
  { to: "/more", label: "More", icon: "⋯" },
] as const;

function SignInScreen() {
  const { signIn } = useAuth();
  return (
    <div className="centered-screen">
      <h1>Togetherment</h1>
      <p>Chores, shopping and plans for the household.</p>
      <button className="btn btn-primary" onClick={() => void signIn()}>
        Sign in with Google
      </button>
    </div>
  );
}

function DeniedScreen() {
  const { user, signOut } = useAuth();
  return (
    <div className="centered-screen">
      <h1>Not a housemate (yet)</h1>
      <p>
        <strong>{user?.email}</strong> isn't on the household allowlist. Ask
        whoever manages the app to add your email to the Firestore rules.
      </p>
      <button className="btn" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}

function MorePage() {
  return (
    <div className="page">
      <h1>More</h1>
      <nav className="more-list">
        <NavLink to="/actions" className="more-link">📌 Action items</NavLink>
        <NavLink to="/gatherings" className="more-link">🍽️ Gatherings</NavLink>
        <NavLink to="/settings" className="more-link">⚙️ Settings</NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  const { user, denied } = useAuth();

  if (user === undefined) {
    return <div className="centered-screen">Loading…</div>;
  }
  if (user === null) return <SignInScreen />;
  if (denied) return <DeniedScreen />;

  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/rota" element={<RotaPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="/actions" element={<ActionsPage />} />
          <Route path="/gatherings" element={<GatheringsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) => `tab ${isActive ? "tab-active" : ""}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
