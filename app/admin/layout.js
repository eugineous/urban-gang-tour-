import { cookies } from "next/headers";
import { isValidSession } from "@/lib/auth";
import AdminLoginForm from "./AdminLoginForm";
import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/crew", label: "Crew" },
  { href: "/admin/performers", label: "Performers" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/blog", label: "Blog / Press" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/shop", label: "Shop" },
  { href: "/admin/people", label: "People / Profiles" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/social", label: "Social Links" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/adsense", label: "AdSense" },
  { href: "/admin/health", label: "Site Health" },
];

export const metadata = { title: "Admin — Urban Gang Tour" };

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ugt_admin_session")?.value;
  const authenticated = isValidSession(token);

  if (!authenticated) {
    return <AdminLoginForm />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f0f0f", color: "#fff" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: "#1a1a1a",
        borderRight: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}>
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid #2a2a2a", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#cc0077", marginBottom: 4 }}>Urban Gang Tour</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Admin Dashboard</div>
        </div>
        <nav style={{ flex: 1, padding: "0 8px" }}>
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "block",
                padding: "9px 12px",
                borderRadius: 6,
                fontSize: 13,
                color: "rgba(255,255,255,0.65)",
                textDecoration: "none",
                marginBottom: 2,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: "16px 16px 0", borderTop: "1px solid #2a2a2a" }}>
          <form action="/api/admin/auth/logout" method="POST">
            <button type="submit" style={{
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: "pointer",
            }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 32, minWidth: 0, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
