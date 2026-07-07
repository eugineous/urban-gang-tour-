"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const error = params.get("error");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    // Save password to sessionStorage so admin pages can use it
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ugt_admin_pw", password);
    }
    // Submit to the login API
    const form = e.currentTarget;
    form.submit();
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f0f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        padding: 40,
        width: "100%",
        maxWidth: 360,
      }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#cc0077", marginBottom: 8 }}>Urban Gang Tour</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Admin Access</div>
        </div>
        {error && (
          <div style={{
            background: "rgba(204,0,119,0.1)",
            border: "1px solid rgba(204,0,119,0.3)",
            borderRadius: 6,
            padding: "10px 14px",
            fontSize: 13,
            color: "#ff6b9d",
            marginBottom: 20,
          }}>
            Incorrect password. Try again.
          </div>
        )}
        <form
          action="/api/admin/auth/login"
          method="POST"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "#111",
                border: "1px solid #333",
                borderRadius: 6,
                color: "#fff",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "12px 20px",
              background: "#cc0077",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginForm() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0f0f0f" }} />}>
      <LoginForm />
    </Suspense>
  );
}
