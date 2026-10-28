import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ROLE_LABELS } from "../lib/types";
import { Clock, XCircle, RefreshCw, LogOut, ShieldAlert } from "lucide-react";

export default function PendingApprovalPage() {
  const { profile, staffRequest, refreshProfile, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const isRejected = staffRequest?.status === "REJECTED";
  const requestedRole = staffRequest?.requested_role;

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          {isRejected ? (
            <XCircle size={52} color="var(--error-600)" />
          ) : (
            <Clock size={52} color="var(--warning-600)" />
          )}
        </div>

        <h2 style={{ marginBottom: 8 }}>
          {isRejected ? "Staff Request Not Approved" : "Awaiting Admin Approval"}
        </h2>

        <p className="subtitle" style={{ marginBottom: 20 }}>
          {isRejected
            ? "Your staff registration was declined by the administrator."
            : "Your staff account has been registered and is pending verification by an administrator."}
        </p>

        <div
          className="card"
          style={{
            textAlign: "left",
            background: "var(--neutral-50)",
            padding: 16,
            marginBottom: 20,
            fontSize: "0.875rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="text-muted">Account Name:</span>
            <strong>{profile?.full_name || staffRequest?.full_name || "Staff Member"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="text-muted">Email:</span>
            <span>{profile?.email || staffRequest?.email}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="text-muted">Requested Role:</span>
            <span className="badge badge-stage">
              {requestedRole ? ROLE_LABELS[requestedRole] : "Staff"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="text-muted">Department:</span>
            <span>{staffRequest?.department || profile?.department || "N/A"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="text-muted">Status:</span>
            {isRejected ? (
              <span className="badge badge-declined">Rejected</span>
            ) : (
              <span className="badge badge-pending">Under Review</span>
            )}
          </div>

          {isRejected && staffRequest?.admin_note && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "var(--error-50)",
                border: "1px solid var(--error-100)",
                borderRadius: "var(--radius-sm)",
                color: "var(--error-700)",
              }}
            >
              <strong>Admin Note:</strong> {staffRequest.admin_note}
            </div>
          )}
        </div>

        {!isRejected && (
          <div
            style={{
              background: "var(--primary-50)",
              border: "1px solid var(--primary-100)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontSize: "0.82rem",
              color: "var(--primary-700)",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              textAlign: "left",
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>
              Once approved by the college administrator, you will automatically gain access to your approver dashboard.
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          {!isRejected && (
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                size={14}
                style={{
                  display: "inline",
                  marginRight: 6,
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              {refreshing ? "Checking..." : "Refresh Status"}
            </button>
          )}

          <button
            type="button"
            className="btn-outline"
            style={{ flex: 1 }}
            onClick={() => signOut()}
          >
            <LogOut size={14} style={{ display: "inline", marginRight: 6 }} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
