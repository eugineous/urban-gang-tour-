"use client";
import { useState, useCallback } from "react";
import { useAdminPw } from "../useAdminPw";
import AdminPwPrompt from "../AdminPwPrompt";

const S = {
  page: { color: "#fff" },
  h1: { fontSize: 26, fontWeight: 800, margin: "0 0 8px" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "0 0 28px" },
  card: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 16 },
  refreshBtn: { background: "#cc0077", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  issueRow: { display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #1e1e1e" },
  severityHigh: { fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(255,107,107,0.15)", color: "#ff6b6b", fontWeight: 700, flexShrink: 0 },
  severityMed: { fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(255,165,0,0.15)", color: "#ffa500", fontWeight: 700, flexShrink: 0 },
  ok: { fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(76,175,80,0.15)", color: "#4caf50", fontWeight: 700 },
};

async function runChecks() {
  const issues = [];

  try {
    const [crew, events, shop, blog] = await Promise.all([
      fetch("/api/admin/crew").then(r => r.json()),
      fetch("/api/admin/events").then(r => r.json()),
      fetch("/api/admin/shop").then(r => r.json()),
      fetch("/api/admin/blog").then(r => r.json()),
    ]);

    // Crew: missing photos
    if (Array.isArray(crew)) {
      crew.filter(c => !c.photo).forEach(c => issues.push({ severity: "high", category: "Crew", item: c.name || c.slug, message: "Missing photo" }));
    }

    // Events: missing dates or images
    if (Array.isArray(events)) {
      events.filter(e => !e.date).forEach(e => issues.push({ severity: "high", category: "Events", item: e.name || e.slug, message: "Missing date" }));
      events.filter(e => !e.image).forEach(e => issues.push({ severity: "medium", category: "Events", item: e.name || e.slug, message: "Missing image" }));
    }

    // Shop: missing images
    if (Array.isArray(shop)) {
      shop.filter(p => !p.image).forEach(p => issues.push({ severity: "medium", category: "Shop", item: p.name || p.id, message: "Missing product image" }));
    }

    // Blog: missing keywords or excerpt
    if (Array.isArray(blog)) {
      blog.filter(p => !p.keywords).forEach(p => issues.push({ severity: "high", category: "Blog", item: p.title || p.slug, message: "Missing SEO keywords" }));
      blog.filter(p => !p.excerpt).forEach(p => issues.push({ severity: "medium", category: "Blog", item: p.title || p.slug, message: "Missing excerpt" }));
      blog.filter(p => p.status === "published" && !p.featuredImage).forEach(p => issues.push({ severity: "medium", category: "Blog", item: p.title || p.slug, message: "Published post missing featured image" }));
    }
  } catch (e) {
    issues.push({ severity: "high", category: "System", item: "API", message: "Failed to fetch data: " + e.message });
  }

  return issues;
}

export default function HealthAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [issues, setIssues] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const check = useCallback(async () => {
    setLoading(true);
    const found = await runChecks();
    setIssues(found);
    setLastChecked(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  const grouped = issues ? issues.reduce((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {}) : null;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Site Health</h1>
      <p style={S.sub}>Scan for missing images, SEO gaps, and data issues.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <button style={S.refreshBtn} onClick={check} disabled={loading}>{loading ? "Checking…" : "Run Health Check"}</button>
        {lastChecked && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Last checked: {lastChecked}</span>}
      </div>

      {issues !== null && (
        issues.length === 0 ? (
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={S.ok}>✓ All clear</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>No issues found across crew, events, shop, and blog.</span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
              Found <strong style={{ color: "#ff6b6b" }}>{issues.length}</strong> issue{issues.length !== 1 ? "s" : ""}
            </div>
            {Object.entries(grouped).map(([category, catIssues]) => (
              <div key={category} style={S.card}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: "#cc0077" }}>{category} ({catIssues.length})</h3>
                {catIssues.map((issue, i) => (
                  <div key={i} style={{ ...S.issueRow, borderBottom: i < catIssues.length - 1 ? "1px solid #1e1e1e" : "none" }}>
                    <span style={issue.severity === "high" ? S.severityHigh : S.severityMed}>{issue.severity}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{issue.item}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{issue.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )
      )}

      {issues === null && !loading && (
        <div style={S.card}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Click "Run Health Check" to scan for issues.</p>
        </div>
      )}
    </div>
  );
}
