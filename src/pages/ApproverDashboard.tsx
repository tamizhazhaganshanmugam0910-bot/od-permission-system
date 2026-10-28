import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { ODRequest, Profile, Stage } from "../lib/types";
import { CATEGORY_LABELS, STAGE_LABELS, ROLE_LABELS } from "../lib/types";
import { generateODPDF } from "../lib/pdf";
import { downloadODProof } from "../lib/proofFiles";
import { api } from "../lib/api";
import { Check, X, CheckCheck, Clock, CheckCircle2, XCircle, Download } from "lucide-react";

export default function ApproverDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [remarkModal, setRemarkModal] = useState<{ req: ODRequest; action: "accept" | "decline" } | null>(null);
  const [remark, setRemark] = useState("");

  const approverStage: Stage | null =
    profile?.role === "COUNSELLOR"
      ? "COUNSELLOR"
      : profile?.role === "CLASS_COORDINATOR"
        ? "CLASS_COORDINATOR"
        : profile?.role === "HOD"
          ? "HOD"
          : null;

  const fetchRequests = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("od_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
    } else {
      setRequests((data as ODRequest[]) || []);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // The approver's pending queue: requests where current_stage matches their role and status is PENDING
  const pendingRequests = approverStage
    ? requests.filter((r) => r.current_stage === approverStage && r.status === "PENDING")
    : [];

  // History: requests this approver has acted on
  const historyRequests = approverStage
    ? requests.filter((r) => {
        if (approverStage === "COUNSELLOR") return r.counsellor_id === profile?.id;
        if (approverStage === "CLASS_COORDINATOR") return r.coordinator_id === profile?.id;
        if (approverStage === "HOD") return r.hod_id === profile?.id;
        return false;
      })
    : requests;

  const advanceRequest = async (req: ODRequest, action: "accept" | "decline", remarkText: string) => {
    if (!profile || !approverStage) return;

    if (action === "decline" && !remarkText.trim()) {
      alert("A comment is mandatory when rejecting a request.");
      return;
    }

    // Try Spring Boot Backend if configured
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    let backendProcessed = false;
    if (apiBaseUrl) {
      try {
        const endpoint = action === "accept"
          ? `/api/od-requests/${req.id}/approve`
          : `/api/od-requests/${req.id}/reject`;
        const res = await api.post(endpoint, {
          actorId: profile.id,
          actorName: profile.full_name,
          actorRole: profile.role,
          comment: remarkText || null,
        });
        if (res.ok) {
          backendProcessed = true;
        }
      } catch (err) {
        console.warn("Backend error, falling back to direct DB update:", err);
      }
    }

    if (!backendProcessed) {
      const updates: Record<string, unknown> = {};
      let historyAction = "APPROVED";

      if (action === "accept") {
        if (approverStage === "COUNSELLOR") {
          updates.counsellor_id = profile.id;
          updates.counsellor_name = profile.full_name;
          updates.counsellor_remark = remarkText || null;
          updates.current_stage = "CLASS_COORDINATOR";
        } else if (approverStage === "CLASS_COORDINATOR") {
          updates.coordinator_id = profile.id;
          updates.coordinator_name = profile.full_name;
          updates.coordinator_remark = remarkText || null;
          updates.current_stage = "HOD";
        } else if (approverStage === "HOD") {
          updates.hod_id = profile.id;
          updates.hod_name = profile.full_name;
          updates.hod_remark = remarkText || null;
          updates.current_stage = "DONE";
          updates.status = "COMPLETED";
          updates.pdf_generated = true;
        }
      } else {
        // Rule 2: Rejection at Stage 2 or 3 sends request back to previous stage, not final
        if (approverStage === "HOD") {
          updates.current_stage = "CLASS_COORDINATOR";
          updates.status = "PENDING";
          updates.hod_name = profile.full_name;
          updates.hod_remark = remarkText;
          historyAction = "REJECTED_TO_PREVIOUS";
        } else if (approverStage === "CLASS_COORDINATOR") {
          updates.current_stage = "COUNSELLOR";
          updates.status = "PENDING";
          updates.coordinator_name = profile.full_name;
          updates.coordinator_remark = remarkText;
          historyAction = "REJECTED_TO_PREVIOUS";
        } else {
          // Stage 1 (COUNSELLOR) reject is final decline
          updates.status = "DECLINED";
          updates.declined_by = "COUNSELLOR";
          updates.decline_reason = remarkText;
          updates.counsellor_name = profile.full_name;
          updates.counsellor_remark = remarkText;
          historyAction = "REJECTED_FINAL";
        }
      }

      updates.last_stage_updated_at = new Date().toISOString();
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("od_requests")
        .update(updates)
        .eq("id", req.id);

      if (updateError) {
        alert("Error updating request: " + updateError.message);
        return;
      }

      // Record in approval_history
      await supabase.from("approval_history").insert({
        od_request_id: req.id,
        stage: approverStage,
        action: historyAction,
        actor_id: profile.id,
        actor_name: profile.full_name,
        actor_role: profile.role,
        comments: remarkText || null,
      });
    }

    fetchRequests();
  };

  const handleAction = (req: ODRequest, action: "accept" | "decline") => {
    setRemarkModal({ req, action });
    setRemark("");
  };

  const handleDownloadProof = async (req: ODRequest) => {
    if (!req.proof_file_path) return;
    const error = await downloadODProof(req.proof_file_path);
    if (error) alert("Could not download proof file: " + error);
  };

  const confirmAction = async () => {
    if (!remarkModal) return;
    setActionLoading(remarkModal.req.id);
    await advanceRequest(remarkModal.req, remarkModal.action, remark);
    setActionLoading(null);
    setRemarkModal(null);
    setRemark("");
  };

  const handleAcceptAll = async () => {
    if (!profile || !approverStage || pendingRequests.length === 0) return;
    setBulkLoading(true);

    for (const req of pendingRequests) {
      const updates: Record<string, unknown> = {};
      if (approverStage === "COUNSELLOR") {
        updates.counsellor_id = profile.id;
        updates.counsellor_name = profile.full_name;
        updates.counsellor_remark = "Bulk approved";
        updates.current_stage = "CLASS_COORDINATOR";
      } else if (approverStage === "CLASS_COORDINATOR") {
        updates.coordinator_id = profile.id;
        updates.coordinator_name = profile.full_name;
        updates.coordinator_remark = "Bulk approved";
        updates.current_stage = "HOD";
      } else if (approverStage === "HOD") {
        updates.hod_id = profile.id;
        updates.hod_name = profile.full_name;
        updates.hod_remark = "Bulk approved";
        updates.current_stage = "DONE";
        updates.status = "COMPLETED";
        updates.pdf_generated = true;
      }
      updates.updated_at = new Date().toISOString();
      await supabase.from("od_requests").update(updates).eq("id", req.id);
    }

    setBulkLoading(false);
    fetchRequests();
  };

  if (!profile || !approverStage) {
    return (
      <div className="page-container">
        <div className="empty-state">Admin dashboard — no approval queue assigned.</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 4 }}>
          {ROLE_LABELS[profile.role]} Dashboard
        </h2>
        <p className="text-muted" style={{ fontSize: "0.875rem" }}>
          {profile.full_name} · {profile.department || "All Departments"}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <Clock size={20} color="var(--warning-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{pendingRequests.length}</div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>In Your Queue</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <CheckCircle2 size={20} color="var(--success-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {historyRequests.filter((r) => {
              if (approverStage === "COUNSELLOR") return r.counsellor_id === profile.id && r.status !== "DECLINED";
              if (approverStage === "CLASS_COORDINATOR") return r.coordinator_id === profile.id;
              if (approverStage === "HOD") return r.hod_id === profile.id;
              return false;
            }).length}
          </div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>Approved by You</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <XCircle size={20} color="var(--error-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {historyRequests.filter((r) => r.status === "DECLINED" && r.declined_by === approverStage).length}
          </div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>Declined by You</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
          Pending Queue ({pendingRequests.length})
        </button>
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          History ({historyRequests.length})
        </button>
      </div>

      {activeTab === "pending" && (
        <>
          {pendingRequests.length > 0 && (
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-success" onClick={handleAcceptAll} disabled={bulkLoading}>
                <CheckCheck size={16} style={{ display: "inline", marginRight: 6 }} />
                {bulkLoading ? "Approving all…" : `Accept All (${pendingRequests.length})`}
              </button>
            </div>
          )}

          {loading ? (
            <div className="empty-state">Loading requests…</div>
          ) : pendingRequests.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <CheckCircle2 size={32} color="var(--neutral-300)" />
                <p>No pending requests in your queue. You're all caught up!</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Dept</th>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Reason</th>
                      <th>Proof File</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((req) => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600 }}>{req.student_name}</td>
                        <td>{req.department}</td>
                        <td>{new Date(req.od_date).toLocaleDateString("en-GB")}</td>
                        <td>{CATEGORY_LABELS[req.category]}</td>
                        <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {req.reason}
                        </td>
                        <td>
                          {req.proof_file_path ? (
                            <button className="btn-outline btn-sm" onClick={() => handleDownloadProof(req)}>
                              <Download size={14} style={{ display: "inline", marginRight: 4 }} />
                              View proof
                            </button>
                          ) : (
                            <span className="text-muted">No file</span>
                          )}
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="btn-success btn-sm"
                              onClick={() => handleAction(req, "accept")}
                              disabled={actionLoading === req.id}
                            >
                              <Check size={14} style={{ display: "inline", marginRight: 4 }} />
                              Accept
                            </button>
                            <button
                              className="btn-danger btn-sm"
                              onClick={() => handleAction(req, "decline")}
                              disabled={actionLoading === req.id}
                            >
                              <X size={14} style={{ display: "inline", marginRight: 4 }} />
                              Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <div className="card">
          {historyRequests.length === 0 ? (
            <div className="empty-state">
              <p>No history yet. Approved and declined requests will appear here.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Dept</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Final Status</th>
                    <th>Your Action</th>
                    <th>Files</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRequests.map((req) => {
                    const myAction =
                      approverStage === "COUNSELLOR"
                        ? req.counsellor_id === profile.id
                        : approverStage === "CLASS_COORDINATOR"
                          ? req.coordinator_id === profile.id
                          : req.hod_id === profile.id;

                    let myLabel = "—";
                    if (req.status === "DECLINED" && req.declined_by === approverStage) {
                      myLabel = "Declined";
                    } else if (myAction) {
                      myLabel = "Accepted";
                    }

                    return (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600 }}>{req.student_name}</td>
                        <td>{req.department}</td>
                        <td>{new Date(req.od_date).toLocaleDateString("en-GB")}</td>
                        <td>{CATEGORY_LABELS[req.category]}</td>
                        <td>
                          {req.status === "COMPLETED" && <span className="badge badge-completed">Completed</span>}
                          {req.status === "PENDING" && (
                            <span className="badge badge-stage">
                              At {STAGE_LABELS[req.current_stage]}
                            </span>
                          )}
                          {req.status === "DECLINED" && (
                            <span className="badge badge-declined">
                              Declined by {STAGE_LABELS[req.declined_by as keyof typeof STAGE_LABELS]}
                            </span>
                          )}
                        </td>
                        <td>
                          {myLabel === "Accepted" && (
                            <span style={{ color: "var(--success-600)", fontWeight: 600, fontSize: "0.8rem" }}>
                              Accepted
                            </span>
                          )}
                          {myLabel === "Declined" && (
                            <span style={{ color: "var(--error-600)", fontWeight: 600, fontSize: "0.8rem" }}>
                              Declined
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-btns">
                          {req.proof_file_path && (
                            <button className="btn-outline btn-sm" onClick={() => handleDownloadProof(req)}>
                              <Download size={14} style={{ display: "inline", marginRight: 4 }} />
                              Proof
                            </button>
                          )}
                          {req.status === "COMPLETED" && (
                            <button className="btn-success btn-sm" onClick={() => generateODPDF(req)}>
                              <Download size={14} style={{ display: "inline", marginRight: 4 }} />
                              Approval PDF
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Remark Modal */}
      {remarkModal && (
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
          onClick={() => setRemarkModal(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 420, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="card-title">
              {remarkModal.action === "accept" ? "Accept Request" : "Decline Request"}
            </h3>
            <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: 16 }}>
              Request by <strong>{remarkModal.req.student_name}</strong> for{" "}
              {CATEGORY_LABELS[remarkModal.req.category]} on{" "}
              {new Date(remarkModal.req.od_date).toLocaleDateString("en-GB")}
            </p>
            <div className="form-group">
              <label>
                Remark {remarkModal.action === "decline" ? "(required — student will see this)" : "(optional)"}
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                placeholder={
                  remarkModal.action === "decline"
                    ? "Explain why this request is declined…"
                    : "Add an optional note…"
                }
              />
            </div>
            {remarkModal.action === "decline" && !remark.trim() && (
              <div className="form-error">Please provide a reason for declining.</div>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setRemarkModal(null)}>
                Cancel
              </button>
              <button
                className={remarkModal.action === "accept" ? "btn-success" : "btn-danger"}
                style={{ flex: 1 }}
                onClick={confirmAction}
                disabled={remarkModal.action === "decline" && !remark.trim()}
              >
                {remarkModal.action === "accept" ? "Confirm Accept" : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
