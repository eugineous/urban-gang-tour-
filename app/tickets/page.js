import Link from "next/link";
import { getAllEvents } from "@/lib/cms";
import JsonLd from "@/components/JsonLd";
import TicketBuyButton from "./TicketBuyButton";

const BASE_URL = "https://urbangangtour.co.ke";

export const metadata = {
  title: "Tickets | Urban Gang Tour",
  description:
    "Buy tickets for Urban Gang Tour events — school concerts, awards shows, and live performances across Kenya.",
  keywords:
    "Urban Gang Tour tickets, buy tickets Kenya, school concert tickets, UGT 2026, Kenyan events tickets, youth events Kenya, school talent show tickets",
  alternates: { canonical: `${BASE_URL}/tickets` },
  openGraph: {
    title: "Tickets | Urban Gang Tour",
    description: "Buy tickets for Urban Gang Tour events.",
    url: `${BASE_URL}/tickets`,
    type: "website",
    images: [{ url: `${BASE_URL}/assets/logos/ugt-logo-full.png` }],
  },
};

function formatDate(dateStr) {
  if (!dateStr) return "Date TBC";
  try {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function TicketsPage() {
  let events = [];
  try {
    const all = await getAllEvents();
    // Only show events with ticket tiers and a future-ish date
    events = all.filter(
      (e) =>
        Array.isArray(e.ticketTiers) &&
        e.ticketTiers.length > 0 &&
        e.status !== "cancelled"
    );
  } catch {
    // Redis unavailable
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Tickets | Urban Gang Tour",
    url: `${BASE_URL}/tickets`,
    description: "Buy tickets for Urban Gang Tour events in Kenya.",
  };

  return (
    <>
      <JsonLd schema={websiteSchema} />

      {/* Hero */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <div className="page-hero-dots" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="eyebrow reveal" style={{ color: "var(--ugt-orange)" }}>
            2026 · Live
          </div>
          <h1
            className="h-display h-lg reveal reveal-delay-1"
            style={{ color: "var(--ugt-white)", marginBottom: "16px" }}
          >
            Get your ticket.
          </h1>
          <p
            className="reveal reveal-delay-2"
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "var(--fs-body-lg)",
              maxWidth: "520px",
              lineHeight: "var(--lh-loose)",
            }}
          >
            All available Urban Gang Tour events in one place. Pick your stop, choose
            your tier, pay with M-Pesa.
          </p>
        </div>
      </section>

      {/* Events */}
      <section className="section" style={{ background: "var(--ugt-bg)" }}>
        <div className="container">
          {events.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "var(--ugt-ink-muted)",
                fontSize: "17px",
              }}
            >
              No ticketed events available right now.{" "}
              <Link
                href="/events"
                style={{ color: "var(--ugt-magenta)", fontWeight: 700 }}
              >
                See all upcoming events →
              </Link>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "32px" }}
              className="reveal"
            >
              {events.map((event) => (
                <div
                  key={event.slug}
                  style={{
                    background: "var(--ugt-white)",
                    border: "var(--border-bold)",
                    borderRadius: "var(--r-xl)",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-sticker-ink)",
                  }}
                >
                  {/* Event header */}
                  <div
                    style={{
                      background: "var(--ugt-bg-dark)",
                      padding: "28px 32px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "16px",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-display-alt)",
                          fontSize: "22px",
                          textTransform: "uppercase",
                          color: "var(--ugt-white)",
                          marginBottom: "8px",
                        }}
                      >
                        {event.name}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.55)",
                          fontWeight: 600,
                        }}
                      >
                        {formatDate(event.date)}
                        {event.location && ` · ${event.location}`}
                      </div>
                    </div>
                    {event.status && (
                      <span
                        className={`chip ${
                          event.status === "confirmed"
                            ? "chip-confirmed"
                            : "chip-outline"
                        }`}
                      >
                        {event.status}
                      </span>
                    )}
                  </div>

                  {/* Ticket tiers */}
                  <div style={{ padding: "24px 32px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--ugt-ink-muted)",
                        marginBottom: "16px",
                      }}
                    >
                      Ticket Tiers
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: "16px",
                      }}
                    >
                      {event.ticketTiers.map((tier) => {
                        const isSoldOut =
                          Number(tier.sold ?? 0) >= Number(tier.capacity ?? 0);
                        return (
                          <div
                            key={tier.id}
                            style={{
                              border: "var(--border-bold)",
                              borderRadius: "var(--r-xl)",
                              padding: "20px 24px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                              opacity: isSoldOut ? 0.6 : 1,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "var(--font-display-alt)",
                                  fontSize: "16px",
                                  textTransform: "uppercase",
                                  color: "var(--ugt-ink)",
                                }}
                              >
                                {tier.label}
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontSize: "20px",
                                  color: "var(--ugt-magenta)",
                                }}
                              >
                                KES {Number(tier.price).toLocaleString()}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--ugt-ink-muted)",
                                fontWeight: 600,
                              }}
                            >
                              {isSoldOut
                                ? "Sold out"
                                : `${
                                    Number(tier.capacity ?? 0) -
                                    Number(tier.sold ?? 0)
                                  } remaining`}
                            </div>
                            {isSoldOut ? (
                              <span
                                className="btn btn-outline btn-sm"
                                style={{
                                  pointerEvents: "none",
                                  opacity: 0.5,
                                  textAlign: "center",
                                }}
                              >
                                Sold Out
                              </span>
                            ) : (
                              <TicketBuyButton
                                event={event}
                                tier={tier}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section section-dark">
        <div className="container">
          <div style={{ maxWidth: "560px" }} className="reveal">
            <div className="eyebrow" style={{ color: "var(--ugt-orange)" }}>
              Bring UGT to you
            </div>
            <h2
              className="h-display h-md"
              style={{ color: "var(--ugt-white)", margin: "12px 0 16px" }}
            >
              Want Urban Gang Tour at your institution?
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: "16px",
                lineHeight: 1.7,
                marginBottom: "32px",
              }}
            >
              Schools, universities, colleges, polytechnics, and mega events.
              One message starts everything.
            </p>
            <Link href="/contact" className="btn btn-magenta btn-lg">
              Propose a stop
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
