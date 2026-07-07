import { notFound } from "next/navigation";
import Link from "next/link";
import { getEvent, getAllEvents } from "@/lib/cms";
import JsonLd from "@/components/JsonLd";
import AddToCalendar from "@/components/AddToCalendar";

const BASE_URL = "https://urbangangtour.co.ke";

export async function generateStaticParams() {
  try {
    const events = await getAllEvents();
    return (events || []).map((e) => ({ slug: e.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  let event = null;
  try { event = await getEvent(params.slug); } catch { /* */ }

  if (!event) return { title: "Event Not Found | Urban Gang Tour" };

  const title = `${event.name} | Urban Gang Tour`;
  const canonical = `${BASE_URL}/schools/${params.slug}`;
  return {
    title,
    description: event.description || `Urban Gang Tour at ${event.name} — ${event.date || ""}. ${event.location || ""}`,
    keywords: `${event.name}, Urban Gang Tour, Kenyan school events, youth talent Kenya, school concert Kenya, PPP TV Kenya`,
    alternates: { canonical },
    openGraph: {
      title,
      url: canonical,
      type: "website",
      images: event.image ? [{ url: event.image.startsWith("http") ? event.image : `${BASE_URL}${event.image}` }] : [],
    },
  };
}

// Format date string like "2026-05-30" to compact ISO for GCal e.g. "20260530T080000"
function toGCalDate(dateStr, timeStr) {
  if (!dateStr) return "";
  const d = dateStr.replace(/-/g, "");
  const t = timeStr ? timeStr.replace(":", "") + "00" : "080000";
  return `${d}T${t}`;
}

export default async function SchoolPage({ params }) {
  let event = null;
  try { event = await getEvent(params.slug); } catch { /* */ }
  if (!event) notFound();

  const imageUrl = event.image
    ? event.image.startsWith("http") ? event.image : `${BASE_URL}${event.image}`
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.date || undefined,
    location: {
      "@type": "Place",
      name: event.location || "Kenya",
      address: { "@type": "PostalAddress", addressCountry: "KE", addressLocality: event.location || "" },
    },
    organizer: { "@type": "Organization", name: "Urban Gang Tour", url: BASE_URL },
    description: event.description || `Urban Gang Tour at ${event.name}`,
    image: imageUrl || `${BASE_URL}/assets/logos/ugt-logo-full.png`,
  };

  const startGCal = toGCalDate(event.date, event.startTime);
  const endGCal = toGCalDate(event.date, event.endTime);

  return (
    <>
      <JsonLd schema={jsonLd} />

      {/* Hero */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <div className="page-hero-dots" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div style={{ marginBottom: "16px" }}>
            <Link href="/stops" style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ← All stops
            </Link>
          </div>
          <div className="eyebrow reveal" style={{ color: "var(--ugt-orange)" }}>
            {event.status || "Tour Stop"}
          </div>
          <h1 className="h-display h-lg reveal reveal-delay-1" style={{ color: "var(--ugt-white)", marginBottom: "16px" }}>
            {event.name}
          </h1>
          {event.theme && (
            <p className="reveal reveal-delay-2" style={{ fontFamily: "var(--font-script)", fontSize: "28px", color: "var(--ugt-magenta)", marginBottom: "12px" }}>
              {event.theme}
            </p>
          )}
          <div className="reveal reveal-delay-3" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", marginTop: "24px" }}>
            {event.date && <span className="chip chip-ink">{event.date}</span>}
            {event.location && <span className="chip chip-outline" style={{ color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.3)" }}>{event.location}</span>}
            {startGCal && (
              <AddToCalendar
                title={event.name}
                startDate={startGCal}
                endDate={endGCal || undefined}
                location={event.location}
                description={event.description}
              />
            )}
          </div>
        </div>
      </section>

      {/* Image */}
      {imageUrl && (
        <div style={{ background: "var(--ugt-ink)", borderBottom: "var(--border-bold)" }}>
          <div className="container">
            <div style={{ maxWidth: "860px", margin: "0 auto", transform: "translateY(-32px)" }}>
              <img src={imageUrl} alt={event.name} style={{ width: "100%", borderRadius: "var(--r-xl)", border: "var(--border-bold)", boxShadow: "var(--shadow-sticker-ink)", display: "block" }} />
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {event.description && (
        <section className="section-sm" style={{ background: "var(--ugt-bg)" }}>
          <div className="container">
            <div style={{ maxWidth: "760px" }}>
              <p style={{ fontSize: "var(--fs-body-lg)", color: "var(--ugt-ink-2)", lineHeight: "var(--lh-loose)", whiteSpace: "pre-wrap" }}>
                {event.description}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Ticket tiers */}
      {Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0 && (
        <section className="section-sm" style={{ background: "var(--ugt-magenta-soft)" }}>
          <div className="container">
            <div className="eyebrow reveal" style={{ marginBottom: "20px" }}>Tickets</div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }} className="reveal reveal-delay-1">
              {event.ticketTiers.map((tier) => {
                const isSoldOut = Number(tier.sold ?? 0) >= Number(tier.capacity ?? 0);
                return (
                  <div key={tier.id} style={{ background: "var(--ugt-white)", border: "var(--border-bold)", borderRadius: "var(--r-xl)", padding: "20px 24px", minWidth: "200px", boxShadow: "var(--shadow-sticker-xs)" }}>
                    <div style={{ fontFamily: "var(--font-display-alt)", fontSize: "16px", textTransform: "uppercase", marginBottom: "8px" }}>{tier.label}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "var(--ugt-magenta)", marginBottom: "8px" }}>KES {Number(tier.price).toLocaleString()}</div>
                    {isSoldOut ? (
                      <span className="chip chip-outline" style={{ opacity: 0.5 }}>Sold Out</span>
                    ) : (
                      <Link href="/tickets" className="btn btn-magenta btn-sm">Buy on Tickets page →</Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section section-dark">
        <div className="container">
          <div style={{ maxWidth: "560px" }} className="reveal">
            <div className="eyebrow" style={{ color: "var(--ugt-orange)" }}>Urban Gang Tour</div>
            <h2 className="h-display h-md" style={{ color: "var(--ugt-white)", margin: "12px 0 16px" }}>
              See all the stops.
            </h2>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <Link href="/stops" className="btn btn-magenta btn-lg">All tour stops</Link>
              <Link href="/tickets" className="btn btn-outline-white btn-lg">Get tickets</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
