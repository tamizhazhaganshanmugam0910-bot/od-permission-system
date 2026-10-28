import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ShieldCheck, AlertTriangle } from "lucide-react";

/**
 * FirstAdminSetup — one-time page at /setup
 * Only usable when no ADMIN profile exists yet.
 * Signs up a new user and immediately sets their role to ADMIN.
 */
export default function FirstAdminSetup() {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if any admin already exists
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "ADMIN")
        .limit(1);

      if (!error && data && data.length > 0) {
        setAdminExists(true);
      }
      setChecking(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Very simple setup key check — env var or hardcoded fallback
    const expectedKey =
      import.meta.env.VITE_ADMIN_SETUP_KEY || "FIRST_ADMIN_SETUP";
    if (setupKey !== expectedKey) {
      setError("Invalid setup key. Contact your system administrator.");
      return;
    }

    setSubmitting(true);

    // 1. Create the auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "ADMIN",
          department: "",
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (!authData.user) {
      setError("Signup succeeded but no user returned. Try signing in.");
      setSubmitting(false);
      return;
    }

    // 2. Wait briefly for the DB trigger to create the profile, then patch role
    await new Promise((r) => setTimeout(r, 800));

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "ADMIN", full_name: fullName })
      .eq("id", authData.user.id);

    if (updateError) {
      // Profile might not exist yet (trigger delay) — try upsert
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: "ADMIN",
        department: "",
      });

      if (upsertError) {
        setError(
          "Account created, but could not set ADMIN role: " + upsertError.message
        );
        setSubmitting(false);
        return;
      }
    }

    setSuccess(true);
    setSubmitting(false);
  };

  if (checking) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <p className="text-muted">Checking system status…</p>
        </div>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <AlertTriangle size={40} color="var(--warning-600)" style={{ marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>Setup Already Complete</h2>
          <p className="subtitle" style={{ marginBottom: 20 }}>
            An admin account already exists. This setup page is disabled.
          </p>
          <button className="btn-primary" onClick={() => navigate("/signin")}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <ShieldCheck size={48} color="var(--success-600)" style={{ marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>Admin Account Created!</h2>
          <p className="subtitle" style={{ marginBottom: 20 }}>
            Your admin account has been set up successfully. You can now sign in
            and manage staff requests.
          </p>
          <button className="btn-primary" onClick={() => navigate("/signin")}>
            Sign In as Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <ShieldCheck size={28} color="var(--primary-600)" />
          <h2 style={{ margin: 0 }}>First Admin Setup</h2>
        </div>
        <p className="subtitle">
          Create the first administrator account for the OD Permission System.
          This page is only available once.
        </p>

        <div
          style={{
            background: "var(--warning-50)",
            border: "1px solid var(--warning-100)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            fontSize: "0.82rem",
            color: "var(--warning-600)",
            marginBottom: 20,
          }}
        >
          ⚠️ This page will be permanently disabled once an admin exists.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Admin name"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@college.edu"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Strong password (min 8 characters)"
            />
          </div>

          <div className="form-group">
            <label>Setup Key</label>
            <input
              type="password"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              required
              placeholder="Enter the one-time setup key"
            />
            <div className="text-muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>
              Set via <code>VITE_ADMIN_SETUP_KEY</code> env variable (default:{" "}
              <code>FIRST_ADMIN_SETUP</code>)
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? "Creating admin account…" : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
