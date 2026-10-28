import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";
import { ROLE_LABELS } from "../lib/types";
import { supabase } from "../lib/supabase";
import { UserCheck, GraduationCap } from "lucide-react";

const STAFF_ROLES: Exclude<Role, "STUDENT" | "ADMIN">[] = [
  "COUNSELLOR",
  "CLASS_COORDINATOR",
  "HOD",
];

export default function SignUpPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [staffPending, setStaffPending] = useState(false);

  const isStaff = role !== "STUDENT";

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (isStaff) {
      // Staff: create auth account with STUDENT role temporarily,
      // then insert a staff_requests row for admin approval.
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "STUDENT", // placeholder until approved
            department,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setSubmitting(false);
        return;
      }

      if (authData.user) {
        // Insert staff request
        const { error: reqError } = await supabase.from("staff_requests").insert({
          user_id: authData.user.id,
          full_name: fullName,
          email,
          requested_role: role,
          department,
          status: "PENDING",
        });

        if (reqError) {
          setError("Account created but could not submit role request: " + reqError.message);
          setSubmitting(false);
          return;
        }

        // Sign out — they can't use the app until approved
        await supabase.auth.signOut();
        setStaffPending(true);
        setSubmitting(false);
        return;
      }
    } else {
      // Student: normal sign-up flow
      const { error: signUpError } = await signUp({
        email,
        password,
        fullName,
        role,
        department,
      });

      if (signUpError) {
        setError(signUpError);
        setSubmitting(false);
        return;
      }

      navigate("/dashboard");
    }
  };

  if (staffPending) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 16 }}>
            <UserCheck size={48} color="var(--success-600)" />
          </div>
          <h2 style={{ marginBottom: 8 }}>Request Submitted!</h2>
          <p className="subtitle" style={{ marginBottom: 20 }}>
            Your account has been created and your{" "}
            <strong>{ROLE_LABELS[role]}</strong> role request is pending admin
            approval. You'll be able to log in once an admin verifies your
            details.
          </p>
          <div
            style={{
              background: "var(--warning-50)",
              border: "1px solid var(--warning-100)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: "0.85rem",
              color: "var(--warning-600)",
            }}
          >
            ⏳ Please wait for admin approval before signing in.
          </div>
          <Link to="/signin" className="btn-primary" style={{ display: "block", textAlign: "center", padding: "10px 20px" }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="subtitle">Sign up to use the OD Permission System</p>

        {/* Role type selector */}
        <div className="role-type-tabs" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className={role === "STUDENT" ? "btn-primary" : "btn-outline"}
            style={{ flex: 1 }}
            onClick={() => setRole("STUDENT")}
          >
            <GraduationCap size={14} style={{ display: "inline", marginRight: 6 }} />
            Student
          </button>
          <button
            type="button"
            className={isStaff ? "btn-primary" : "btn-outline"}
            style={{ flex: 1 }}
            onClick={() => setRole("COUNSELLOR")}
          >
            <UserCheck size={14} style={{ display: "inline", marginRight: 6 }} />
            Staff
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@college.edu"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-row">
            {isStaff && (
              <div className="form-group">
                <label>Staff Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={role === "STUDENT" ? "e.g. Computer Science" : "Optional"}
                required={role === "STUDENT"}
              />
            </div>
          </div>

          {isStaff && (
            <div
              style={{
                background: "var(--primary-50)",
                border: "1px solid var(--primary-100)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                fontSize: "0.82rem",
                color: "var(--primary-700)",
                marginBottom: 12,
              }}
            >
              ℹ️ Staff accounts require admin approval before you can sign in.
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", marginTop: 8 }}
            disabled={submitting}
          >
            {submitting
              ? isStaff
                ? "Submitting request…"
                : "Creating account…"
              : isStaff
              ? "Request Staff Account"
              : "Sign Up"}
          </button>
        </form>

        <div style={{ margin: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span style={{ color: "#64748b", fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>

        <button
          type="button"
          className="btn-outline"
          style={{ width: "100%", marginBottom: 12 }}
          onClick={handleGoogleSignIn}
          disabled={submitting}
        >
          Continue with Google
        </button>

        <div className="switch-link">
          Already have an account? <Link to="/signin">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
