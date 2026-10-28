import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { ODRequest, Category } from "../lib/types";
import { CATEGORY_LABELS, STAGE_LABELS } from "../lib/types";
import { generateODPDF } from "../lib/pdf";
import { downloadODProof, validateODProofFile, uploadODProof } from "../lib/proofFiles";
import { Download, CheckCircle2, XCircle, Clock, Plus, FileText } from "lucide-react";

const CATEGORIES: Category[] = ["SPORTS", "TECHNICAL", "NON_TECHNICAL", "OTHERS"];

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [odDate, setOdDate] = useState("");
  const [category, setCategory] = useState<Category>("SPORTS");
  const [reason, setReason] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("od_requests")
      .select("*")
      .eq("student_id", profile.id)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!profile) return;

    if (!odDate || !reason.trim() || !proofFile) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const proofFileError = validateODProofFile(proofFile);
    if (proofFileError) {
      setFormError(proofFileError);
      return;
    }

    setSubmitting(true);
    const requestId = crypto.randomUUID();
    const { path: proofFilePath, error: uploadError } = await uploadODProof(profile.id, requestId, proofFile);

    if (uploadError || !proofFilePath) {
      setFormError(uploadError || "Could not upload the proof file.");
      setSubmitting(false);
      return;
    }

    const initialStage = profile.role === "MANAGER" ? "CLASS_COORDINATOR" : "COUNSELLOR";

    const { error: insertError } = await supabase.from("od_requests").insert({
      id: requestId,
      student_id: profile.id,
      student_name: profile.full_name,
      department: profile.department || "N/A",
      proof_file_path: proofFilePath,
      od_date: odDate,
      category,
      reason: reason.trim(),
      current_stage: initialStage,
      status: "PENDING",
      last_stage_updated_at: new Date().toISOString(),
    });

    if (insertError) {
      await supabase.storage.from("od-proofs").remove([proofFilePath]);
      setFormError(insertError.message);
      setSubmitting(false);
      return;
    }

    await supabase.from("approval_history").insert({
      od_request_id: requestId,
      stage: initialStage,
      action: "SUBMITTED",
      actor_id: profile.id,
      actor_name: profile.full_name,
      actor_role: profile.role,
      comments: "Request submitted",
    });

    // reset
    setOdDate("");
    setCategory("SPORTS");
    setReason("");
    setProofFile(null);
    setShowForm(false);
    setSubmitting(false);
    fetchRequests();
  };

  const handleDownload = (req: ODRequest) => {
    generateODPDF(req);
  };

  const handleDownloadProof = async (req: ODRequest) => {
    if (!req.proof_file_path) return;
    const error = await downloadODProof(req.proof_file_path);
    if (error) alert("Could not download proof file: " + error);
  };

  if (!profile) return null;

  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const declinedCount = requests.filter((r) => r.status === "DECLINED").length;

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 className="page-title" style={{ marginBottom: 4 }}>My OD Requests</h2>
          <p className="text-muted" style={{ fontSize: "0.875rem" }}>
            Welcome, {profile.full_name}. Department: {profile.department || "N/A"}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} style={{ display: "inline", marginRight: 6 }} />
          {showForm ? "Cancel" : "New OD Request"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <Clock size={20} color="var(--warning-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{pendingCount}</div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>Pending</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <CheckCircle2 size={20} color="var(--success-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{completedCount}</div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>Completed</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <XCircle size={20} color="var(--error-600)" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{declinedCount}</div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>Declined</div>
        </div>
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Submit New OD Request</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Student Name</label>
                <input type="text" value={profile.full_name} disabled />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input type="text" value={profile.department || "N/A"} disabled />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>OD Date *</label>
                <input
                  type="date"
                  value={odDate}
                  onChange={(e) => setOdDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Reason / Description *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Describe the reason for your OD request…"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label htmlFor="od-proof-file">Supporting proof file * (PDF, JPG, or PNG; max 10 MB)</label>
              <input
                id="od-proof-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                required
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
              {proofFile && <span className="text-muted">Selected: {proofFile.name}</span>}
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: 8 }}>
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        </div>
      )}

      {/* Request List */}
      {loading ? (
        <div className="empty-state">Loading your requests…</div>
      ) : requests.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FileText size={32} color="var(--neutral-300)" />
            <p>No OD requests yet. Click "New OD Request" to submit one.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="card-title">Request History</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Reason</th>
                  <th>Current Approver</th>
                  <th>Status</th>
                  <th>Files</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>{new Date(req.od_date).toLocaleDateString("en-GB")}</td>
                    <td>{CATEGORY_LABELS[req.category]}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {req.reason}
                    </td>
                    <td>
                      {req.status === "PENDING" && (
                        <span className="badge badge-stage">{STAGE_LABELS[req.current_stage]}</span>
                      )}
                      {req.status === "RETURNED_FOR_CORRECTION" && (
                        <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                          Returned for Correction
                        </span>
                      )}
                      {req.status === "DECLINED" && (
                        <span className="badge badge-declined">
                          Declined by {STAGE_LABELS[req.declined_by as keyof typeof STAGE_LABELS] || req.declined_by}
                        </span>
                      )}
                      {req.status === "COMPLETED" && (
                        <span className="text-muted" style={{ fontSize: "0.8rem" }}>All approved</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={req.status} />
                      {(req.status === "DECLINED" || req.status === "RETURNED_FOR_CORRECTION") && req.decline_reason && (
                        <div className="remark-text">{req.decline_reason}</div>
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
                          <button className="btn-success btn-sm" onClick={() => handleDownload(req)}>
                            <FileText size={14} style={{ display: "inline", marginRight: 4 }} />
                            Approval PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ODRequest["status"] }) {
  if (status === "PENDING") return <span className="badge badge-pending">Pending</span>;
  if (status === "COMPLETED") return <span className="badge badge-completed">Completed</span>;
  if (status === "RETURNED_FOR_CORRECTION") {
    return <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>Needs Correction</span>;
  }
  return <span className="badge badge-declined">Declined</span>;
}
