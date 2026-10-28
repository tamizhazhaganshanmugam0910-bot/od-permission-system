import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";
import StudentDashboard from "./pages/StudentDashboard";
import ApproverDashboard from "./pages/ApproverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import FirstAdminSetup from "./pages/FirstAdminSetup";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import { ROLE_LABELS } from "./lib/types";
import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="empty-state">Loading…</div>;
  }
  if (!profile) {
    return <Navigate to="/signin" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function Header() {
  const { profile, signOut } = useAuth();
  if (!profile) return null;

  return (
    <header className="app-header">
      <h1>
        <GraduationCap size={22} color="var(--primary-600)" />
        OD Permission System
      </h1>
      <div className="header-user">
        <span className={`header-badge ${profile.role === "ADMIN" ? "header-badge-admin" : ""}`}>
          {profile.role === "ADMIN" && (
            <ShieldCheck size={12} style={{ display: "inline", marginRight: 4 }} />
          )}
          {ROLE_LABELS[profile.role]}
        </span>
        <span className="text-muted" style={{ fontSize: "0.85rem" }}>
          {profile.full_name || profile.email}
        </span>
        <button className="btn-outline btn-sm" onClick={() => signOut()}>
          <LogOut size={14} style={{ display: "inline", marginRight: 4 }} />
          Sign Out
        </button>
      </div>
    </header>
  );
}

function DashboardRouter() {
  const { profile, staffRequest } = useAuth();
  if (!profile) return null;

  if (profile.role === "ADMIN") return <AdminDashboard />;
  if (staffRequest && (staffRequest.status === "PENDING" || staffRequest.status === "REJECTED")) {
    return <PendingApprovalPage />;
  }
  if (profile.role === "STUDENT") return <StudentDashboard />;
  return <ApproverDashboard />;
}

export default function App() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="empty-state">Loading…</div>;
  }

  return (
    <Routes>
      {/* First-admin one-time setup */}
      <Route path="/setup" element={<FirstAdminSetup />} />

      {/* Public auth routes */}
      <Route
        path="/signup"
        element={profile ? <Navigate to="/dashboard" replace /> : <SignUpPage />}
      />
      <Route
        path="/signin"
        element={profile ? <Navigate to="/dashboard" replace /> : <SignInPage />}
      />

      {/* Protected dashboard — role-based rendering */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <div className="app-shell">
              <Header />
              <DashboardRouter />
            </div>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={profile ? "/dashboard" : "/signin"} replace />} />
    </Routes>
  );
}
