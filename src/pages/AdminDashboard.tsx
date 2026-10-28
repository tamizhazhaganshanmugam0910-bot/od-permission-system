import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { StaffRequest } from "../lib/types";
import { ROLE_LABELS } from "../lib/types";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [noteModal, setNoteModal] = useState<{
    req: StaffRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staff_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching staff requests:", error);
    } else {
      setRequests((data as StaffRequest[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const historyRequests = requests.filter((r) => r.status !== "PENDING");

  const handleAction = (req: StaffRequest, action: "approve" | "reject") => {
    setNoteModal({ req, action });
    setAdminNote("");
  };

  const confirmAction = async () => {
    if (!noteModal || !profile) return;
    const { req, action } = noteModal;
    setActionLoading(req.id);

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // 0. Call Java Spring Boot backend if configured
    let backendProcessed = false;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl) {
      try {
        const endpoint = action === "approve" ? "/api/admin/approve-staff" : "/api/admin/reject-staff";
        const res = await api.post(endpoint, {
          requestId: req.id,
          userId: req.user_id,
          role: req.requested_role,
          adminNote: adminNote || null,
        });
        if (res.ok) {
          backendProcessed = true;
        }
      } catch (err) {
        console.warn("Spring Boot backend request error, falling back to direct DB update:", err);
      }
    }

    if (!backendProcessed) {
      // 1. Try atomic RPC first
      const { error: rpcError } = await supabase.rpc("review_staff_request", {
        req_id: req.id,
        new_status: newStatus,
        note: adminNote || null,
      });

      if (rpcError) {
        // 2. Fallback to direct table updates
        if (action === "approve") {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              role: req.requested_role,
              department: req.department || undefined,
            })
            .eq("id", req.user_id);

          if (profileError) {
            alert("Error updating role: " + profileError.message);
            setActionLoading(null);
            return;
          }
        }

        const { error: reqError } = await supabase
          .from("staff_requests")
          .update({
            status: newStatus,
            admin_note: adminNote || null,
            reviewed_by: profile.full_name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", req.id);

        if (reqError) {
          alert("Error updating request: " + reqError.message);
        }
      }
    }
    setActionLoading(null);
    setNoteModal(null);
    setAdminNote("");
    fetchRequests();
  };

  if (!profile || profile.role !== "ADMIN") {
    return (
      <div className="page-container">
        <div className="empty-state">Access denied — Admin only.</div>
      </div>
    );
  }

  const displayed = activeTab === "pending" ? pendingRequests : historyRequests;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={24} color="var(--primary-600)" />
          Admin Dashboard
        </h2>
        <p className="text-muted" style={{ fontSize: "0.875rem" }}>
          {profile.full_name} · Manage staff role requests
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <Clock size={20} color="var(--warning-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{pendingRequests.length}</div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>Pending Requests</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <CheckCircle2 size={20} color="var(--success-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {requests.filter((r) => r.status === "APPROVED").length}
          </div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>Approved</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <XCircle size={20} color="var(--error-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {requests.filter((r) => r.status === "REJECTED").length}
          </div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>Rejected</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending ({pendingRequests.length})
        </button>
        <button
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History ({historyRequests.length})
        </button>
        <button
          className="btn-outline btn-sm"
          style={{ marginLeft: "auto", alignSelf: "center" }}
          onClick={fetchRequests}
          disabled={loading}
        >
          <RefreshCw size={14} style={{ display: "inline", marginRight: 4 }} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state">Loading requests…</div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <Users size={32} color="var(--neutral-300)" />
            <p>
              {activeTab === "pending"
                ? "No pending staff requests. All caught up!"
                : "No review history yet."}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Requested Role</th>
                  <th>Department</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  {activeTab === "pending" && <th>Actions</th>}
                  {activeTab === "history" && <th>Admin Note</th>}
                </tr>
              </thead>
              <tbody>
                {displayed.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600 }}>{req.full_name}</td>
                    <td className="text-muted" style={{ fontSize: "0.85rem" }}>
                      {req.email}
                    </td>
                    <td>
                      <span className="badge badge-stage">
                        {ROLE_LABELS[req.requested_role]}
                      </span>
                    </td>
                    <td>{req.department || "—"}</td>
                    <td className="text-muted" style={{ fontSize: "0.82rem" }}>
                      {new Date(req.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td>
                      {req.status === "PENDING" && (
                        <span className="badge badge-pending">Pending</span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="badge badge-completed">Approved</span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="badge badge-declined">Rejected</span>
                      )}
                    </td>
                    {activeTab === "pending" && (
                      <td>
                        <div className="action-btns">
                          <button
                            className="btn-success btn-sm"
                            onClick={() => handleAction(req, "approve")}
                            disabled={actionLoading === req.id}
                          >
                            <CheckCircle2
                              size={14}
                              style={{ display: "inline", marginRight: 4 }}
                            />
                            Approve
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleAction(req, "reject")}
                            disabled={actionLoading === req.id}
                          >
                            <XCircle
                              size={14}
                              style={{ display: "inline", marginRight: 4 }}
                            />
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                    {activeTab === "history" && (
                      <td>
                        <span className="remark-text">
                          {req.admin_note || "—"}
                        </span>
                        {req.reviewed_by && (
                          <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                            by {req.reviewed_by}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {noteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setNoteModal(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 440, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="card-title">
              {noteModal.action === "approve" ? "Approve" : "Reject"} Staff Request
            </h3>
            <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: 16 }}>
              <strong>{noteModal.req.full_name}</strong> ({noteModal.req.email}) is
              requesting the{" "}
              <strong>{ROLE_LABELS[noteModal.req.requested_role]}</strong> role.
            </p>

            {noteModal.action === "approve" && (
              <div
                style={{
                  background: "var(--success-50)",
                  border: "1px solid var(--success-100)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  fontSize: "0.82rem",
                  color: "var(--success-700)",
                  marginBottom: 16,
                }}
              >
                ✅ Their profile role will be updated to{" "}
                <strong>{ROLE_LABELS[noteModal.req.requested_role]}</strong> and they
                will gain access immediately upon next sign-in.
              </div>
            )}

            <div className="form-group">
              <label>Admin Note (optional)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder={
                  noteModal.action === "approve"
                    ? "Any notes for this approval…"
                    : "Reason for rejection (recommended)…"
                }
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setNoteModal(null)}
              >
                Cancel
              </button>
              <button
                className={noteModal.action === "approve" ? "btn-success" : "btn-danger"}
                style={{ flex: 1 }}
                onClick={confirmAction}
                disabled={!!actionLoading}
              >
                {actionLoading
                  ? "Processing…"
                  : noteModal.action === "approve"
                  ? "Confirm Approve"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
