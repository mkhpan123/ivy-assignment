import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("demo1@ivy.homes");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    const from = (location.state as { from?: string })?.from || "/listings";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/listings", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "2rem",
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: "0.9rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", color: "var(--brand-dark)" }}>Ivy Homes</h1>
          <p className="muted" style={{ marginTop: 4 }}>Sign in to browse listings</p>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo1@ivy.homes"
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <p className="muted">Demo accounts: demo1@ivy.homes, demo2@ivy.homes, demo3@ivy.homes</p>
      </form>
    </div>
  );
}
