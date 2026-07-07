"use client";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "#111",
  border: "1px solid #333",
  borderRadius: 6,
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export default function AdminPwPrompt({ pw, setPw }) {
  if (pw) return null;
  return (
    <div style={{
      background: "#1a1a1a",
      border: "1px solid #2a2a2a",
      borderRadius: 8,
      padding: "20px 24px",
      marginBottom: 24,
      maxWidth: 400,
    }}>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
        Enter your admin password to continue:
      </p>
      <input
        type="password"
        placeholder="Admin password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}
