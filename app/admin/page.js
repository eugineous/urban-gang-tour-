import Link from "next/link";

const SECTIONS = [
  { href: "/admin/events", label: "Events", desc: "Tour stops, dates, ticket tiers" },
  { href: "/admin/crew", label: "Crew", desc: "Crew members and bios" },
  { href: "/admin/performers", label: "Performers", desc: "Artists per stop" },
  { href: "/admin/partners", label: "Partners", desc: "Partner logos and descriptions" },
  { href: "/admin/blog", label: "Blog / Press", desc: "Write and publish articles" },
  { href: "/admin/gallery", label: "Gallery", desc: "Photo albums per stop" },
  { href: "/admin/shop", label: "Shop", desc: "Merch products and prices" },
  { href: "/admin/people", label: "People / Profiles", desc: "Individual profile pages" },
  { href: "/admin/tickets", label: "Tickets", desc: "Orders and revenue" },
  { href: "/admin/settings", label: "Settings", desc: "Tagline, email, hero stats" },
  { href: "/admin/social", label: "Social Links", desc: "Instagram, TikTok, YouTube URLs" },
  { href: "/admin/announcements", label: "Announcements", desc: "Sitewide banner" },
  { href: "/admin/faqs", label: "FAQs", desc: "Frequently asked questions" },
  { href: "/admin/testimonials", label: "Testimonials", desc: "Quotes and reviews" },
  { href: "/admin/seo", label: "SEO", desc: "Page titles and meta descriptions" },
  { href: "/admin/adsense", label: "AdSense", desc: "Publisher ID and ad slots" },
  { href: "/admin/health", label: "Site Health", desc: "Broken images, missing meta" },
];

export default function AdminDashboard() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>Dashboard</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", marginTop: 6, fontSize: 14 }}>
          Manage everything on urbangangtour.co.ke
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {SECTIONS.map(({ href, label, desc }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 10,
              padding: "20px 20px",
              transition: "border-color 0.15s",
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
