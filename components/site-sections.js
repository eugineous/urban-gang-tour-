"use client";

import Link from "next/link";
import { Dot } from "lucide-react";
import { site } from "@/lib/site-data";

/* ─────────────────────────────────────────────
   SHARED: SectionHead (new pill-kicker style)
───────────────────────────────────────────── */
export function SectionHead({ kicker, title, copy, cta, light = false }) {
  return (
    <div className={`section-head-new${light ? " section-head-new--light" : ""}`}>
      <div className="section-head-new__row">
        <div>
          {kicker && (
            <span className="kicker-pill" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
              {kicker}
            </span>
          )}
          <h2>{title}</h2>
          {copy && <p style={{ marginTop: "1.25rem" }}>{copy}</p>}
        </div>
        {cta && <div style={{ flexShrink: 0 }}>{cta}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SHARED: PageHero
───────────────────────────────────────────── */
export function PageHero({ kicker, title, copy, chips = [] }) {
  return (
    <section className="hero-concert" style={{ minHeight: "60svh" }}>
      <div className="hero-concert__bg" />
      <div className="container" style={{ position: "relative", zIndex: 1, paddingTop: "2rem", paddingBottom: "2rem" }}>
        {kicker && (
          <div style={{ marginBottom: "1.2rem" }}>
            <span className="kicker-pill">{kicker}</span>
          </div>
        )}
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
          lineHeight: 0.95,
          letterSpacing: "-0.04em",
          textTransform: "uppercase",
          color: "var(--ugt-white)",
          margin: "0 0 1.5rem",
          maxWidth: "18ch",
          textWrap: "balance"
        }}>
          {title}
        </h1>
        {copy && (
          <p style={{
            fontSize: "clamp(1rem, 1.6vw, 1.15rem)",
            lineHeight: 1.75,
            color: "rgba(255,255,255,0.75)",
            maxWidth: "56ch",
            marginBottom: chips.length ? "1.5rem" : 0
          }}>
            {copy}
          </p>
        )}
        {chips.length > 0 && (
          <div className="page-hero__chips">
            {chips.map((chip) => (
              <span className="chip" key={chip}>{chip}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOME: HeroSection — Concert poster style
───────────────────────────────────────────── */
export function HeroSection() {
  return (
    <section className="hero-concert">
      <div className="hero-concert__bg" />
      <div className="container hero-concert__inner">
        {/* Copy column */}
        <div className="hero-concert__copy">
          <div className="hero-concert__kicker">
            <span className="kicker-pill">Term 2 · Live</span>
            <span className="kicker-pill kicker-pill--outline">3 schools confirmed</span>
          </div>
          <h1 className="hero-concert__title">
            Your talent was<br />
            <span className="grad-text">always real.</span><br />
            <span className="text-outline" style={{ WebkitTextStroke: "2px white" }}>Now it has</span><br />
            somewhere to go.
          </h1>
          <p className="hero-concert__sub">
            Urban Gang Tour goes into schools, universities, colleges, and large-scale events across Kenya. Students perform. Schools celebrate. Sponsors get broadcast-level visibility. The whole thing airs on PPP TV.
          </p>
          <div className="hero-concert__ctas">
            <Link className="button button--xl button--pulse" href="/contact">Book a Stop</Link>
            <Link className="button button--ghost-xl" href="/schools">See where we go</Link>
          </div>
        </div>

        {/* Photo column */}
        <div className="hero-concert__photo-col">
          <div className="hero-concert__photo">
            <img src="/assets/people/eugine-lucy.jpg" alt="Eugine Micah and Lucy Ogunde" />
            <div className="hero-concert__stat-card glass">
              <span>Term 2 · Live</span>
              <strong>3 schools confirmed</strong>
              <p>Kiambu County · May–July 2026</p>
            </div>
          </div>
        </div>

        {/* Stats strip — full width below */}
        <div className="hero-concert__stats-row">
          <div className="hero-stats-strip">
            {site.heroStats.map((stat) => (
              <div className="hero-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOME: Marquee
───────────────────────────────────────────── */
export function Marquee() {
  const items = [
    "Koinange Girls, 30 May 2026",
    "Loreto Kiambu, 1 June 2026",
    "Gathirimu Girls, 4 July 2026",
    "PPP TV Kenya",
    "Urban News",
    "NACADA",
    "Beatitudes Ministries International (BMI)",
    "Universities coming",
    "Bookings open",
    site.brand.motto,
  ];
  const track = items.map((item, i) => (
    <span key={i}>{item}<Dot aria-hidden="true" className="ticker-sep" /></span>
  ));
  return (
    <div className="marquee">
      <div className="marquee__track marquee__track--xl">
        <span>{track}</span>
        <span>{track}</span>
        <span>{track}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HOME: SchoolsPreview — Concert lineup style
───────────────────────────────────────────── */
export function SchoolsPreview() {
  return (
    <section className="section section--dark">
      <div className="container">
        <SectionHead
          kicker="Term 2 calendar"
          title="Three stops. Term 2. More coming."
          copy="Every stop gets its own page and its own story. This is not a list of school names."
          cta={
            <Link className="button button--light" href="/schools">All tour stops</Link>
          }
        />
        <div
          className="route-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "1rem" }}
        >
          {site.schools.map((school, i) => (
            <article
              className={`ticket-card reveal-scroll stagger-${i + 1}${i === 0 ? " ticket-card--lead" : ""}`}
              key={school.slug}
            >
              <div className="ticket-card__top">
                <div className="ticket-card__date">{school.date}</div>
                <div className="ticket-card__name" style={{ color: i === 0 ? "var(--ugt-magenta)" : school.accent }}>
                  {school.name}
                </div>
                <div className="ticket-card__theme">{school.theme}</div>
                <div className="ticket-card__meta">
                  <span className="mini-chip">{school.location}</span>
                </div>
              </div>
              <div className="ticket-card__tear" />
              <div className="ticket-card__footer">
                <span className="ticket-card__status" style={{ background: school.accent }}>
                  {school.status}
                </span>
                <Link className="ticket-card__link" href={`/schools/${school.slug}`}>
                  Open →
                </Link>
              </div>
            </article>
          ))}

          {/* Ghost "Your stop" card */}
          <article className="ticket-card ticket-card--ghost reveal-scroll stagger-4">
            <div className="ticket-card__top">
              <div className="ticket-card__date">Not yet confirmed</div>
              <div className="ticket-card__name" style={{ color: "rgba(255,255,255,0.5)" }}>
                Your stop.
              </div>
              <div className="ticket-card__theme">
                Is your school, university, college, church, or event ready for Urban Gang Tour?
              </div>
              <div className="ticket-card__meta">
                <span className="mini-chip" style={{ opacity: 0.4 }}>Countrywide</span>
              </div>
            </div>
            <div className="ticket-card__tear" />
            <div className="ticket-card__footer">
              <span className="ticket-card__status" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                Open
              </span>
              <Link className="ticket-card__link" href="/contact">
                Propose →
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOME: ProofSection — Bento grid
───────────────────────────────────────────── */
const PROOF_ACCENTS = [
  "var(--ugt-magenta)",
  "var(--ugt-orange)",
  "var(--ugt-pptv-blue)",
  "var(--ugt-church-purple)",
];

export function ProofSection() {
  return (
    <section className="section section--light">
      <div className="container">
        <SectionHead
          kicker="Why the format lands"
          title="This is not a one-day show."
          copy="Most events happen and disappear. Urban Gang Tour stays. Every stop leaves behind a TV episode, a club in the school, 12 social clips, and students who now know what recognition feels like."
          light
        />
        <div className="bento">
          {site.promiseCards.map((card, i) => (
            <article
              className={`proof-card-new reveal-scroll stagger-${i + 1}${i === 0 ? " bento__cell--wide" : ""}`}
              key={card.number}
              style={{ borderTopColor: PROOF_ACCENTS[i] }}
            >
              <div className="proof-card-new__num" style={{ color: PROOF_ACCENTS[i] }}>
                {card.number}
              </div>
              <p>{card.title}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOME: PodsStrip — Numbered tiles
───────────────────────────────────────────── */
const POD_ACCENTS = [
  "var(--ugt-magenta)",
  "var(--ugt-orange)",
  "var(--ugt-pptv-blue)",
  "var(--ugt-green)",
  "var(--ugt-church-purple)",
];

export function PodsStrip() {
  return (
    <section className="section section--soft">
      <div className="container">
        <SectionHead
          kicker="Urban Pods"
          title="Before the stage opens, the real work starts."
          copy="Five conversations. Real speakers. No filler. This is what separates a show from something that actually changes a student's week."
          cta={
            <Link className="button button--ghost" href="/about#pods">Learn more</Link>
          }
          light
        />
        <div className="pods-grid">
          {site.pods.map((pod, i) => (
            <article
              className={`pod-tile reveal-scroll stagger-${i + 1}`}
              key={pod.number}
              style={{ borderTopColor: POD_ACCENTS[i] }}
            >
              <div className="pod-tile__num" style={{ color: POD_ACCENTS[i] }}>
                {pod.number}
              </div>
              <h3>{pod.title}</h3>
              <p>{pod.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOME: TimelineStrip — Horizontal scroll on mobile
───────────────────────────────────────────── */
const TIMELINE_ACCENTS = [
  "var(--ugt-magenta)",
  "var(--ugt-orange)",
  "var(--ugt-pptv-blue)",
  "var(--ugt-green)",
];

export function TimelineStrip() {
  const publicPhases = site.phases.filter((p) => p.public);
  return (
    <section className="section section--dark">
      <div className="container">
        <SectionHead
          kicker="Run of show"
          title="The energy is real. The day is not loose."
        />
        <div className="timeline-new">
          {publicPhases.map((phase, i) => (
            <article className={`timeline-card-new reveal-scroll stagger-${i + 1}`} key={phase.time}>
              <div
                className="timeline-card-new__time"
                style={{ background: TIMELINE_ACCENTS[i % TIMELINE_ACCENTS.length] }}
              >
                {phase.time}
              </div>
              <h3>{phase.title}</h3>
              <p>{phase.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOME: MachineSection — crew left, partners right
───────────────────────────────────────────── */
export function MachineSection() {
  const featuredCrew = [
    site.crewGroups[0].members[0], // Eugine
    site.crewGroups[0].members[1], // Lucy
    site.crewGroups[2].members[0], // Hype Ola
    site.crewGroups[3].members[0], // Rania
  ];
  const featuredPartners = site.partners.slice(0, 6);

  return (
    <section className="section section--light">
      <div className="container">
        <SectionHead
          kicker="The movement"
          title="Serious institutions already in the room."
          light
        />
        <div className="machine-layout">
          {/* Crew side */}
          <div className="machine-crew">
            <div className="machine-sub-kicker">The people who make the stage mean something</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "1rem" }}>
              {featuredCrew.map((member) => (
                <article className="crew-photo-card reveal-scroll" key={member.name}>
                  <div className="crew-photo-card__img">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} />
                    ) : (
                      <div className="crew-initial">{member.initial || member.name[0]}</div>
                    )}
                  </div>
                  <div className="crew-photo-card__body">
                    <div className="crew-photo-card__role">{member.role.split("·")[0].trim()}</div>
                    <div className="crew-photo-card__name">{member.name}</div>
                  </div>
                </article>
              ))}
            </div>
            <div className="button-row" style={{ marginTop: "1.2rem" }}>
              <Link className="button" href="/crew">Full crew →</Link>
            </div>
          </div>

          {/* Partners side */}
          <div className="machine-partners">
            <div className="machine-sub-kicker">Partners already in the room</div>
            <div className="logo-wall">
              {featuredPartners.map((partner) => (
                <div className="logo-cell reveal-scroll" key={partner.name}>
                  {partner.logo ? (
                    <img src={partner.logo} alt={partner.name} />
                  ) : (
                    <div className="logo-cell__initial" style={{ color: partner.accent }}>
                      {partner.initial || partner.name[0]}
                    </div>
                  )}
                  <span>{partner.name}</span>
                </div>
              ))}
            </div>
            <div className="button-row" style={{ marginTop: "1.2rem" }}>
              <Link className="button button--ghost" href="/partners">See the partner story</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOME: CtaSection — Full magenta, massive
───────────────────────────────────────────── */
export function CtaSection({
  kicker = "Ready to move",
  title = "Your school. Your campus. Your brand. Your stop.",
  copy = "One message starts everything.",
  primaryLabel = "Book a Stop",
  primaryHref = "/contact",
  secondaryLabel = "Become a Partner",
  secondaryHref = "/partners"
}) {
  return (
    <section className="cta-concert">
      <div className="cta-concert__deco" />
      <div className="container cta-concert__inner">
        <div className="cta-concert__kicker">{kicker}</div>
        <h2 className="cta-concert__title">{title}</h2>
        <p className="cta-concert__copy">{copy}</p>
        <div className="cta-concert__buttons">
          <Link className="button button--light button--xl" href={primaryHref}>{primaryLabel}</Link>
          <Link
            className="button button--ghost-xl"
            href={secondaryHref}
            style={{ borderColor: "rgba(255,255,255,0.5)", color: "white" }}
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SHARED: TimelineSection (school detail + about)
───────────────────────────────────────────── */
export function TimelineSection() {
  const publicPhases = site.phases.filter((p) => p.public);
  return (
    <section className="section section--dark">
      <div className="container">
        <SectionHead
          kicker="Run of show"
          title="The energy is real. The day is not loose."
        />
        <div className="timeline-new">
          {publicPhases.map((phase, i) => (
            <article className={`timeline-card-new reveal-scroll stagger-${i + 1}`} key={phase.time}>
              <div
                className="timeline-card-new__time"
                style={{ background: TIMELINE_ACCENTS[i % TIMELINE_ACCENTS.length] }}
              >
                {phase.time}
              </div>
              <h3>{phase.title}</h3>
              <p>{phase.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SHARED: DownloadsSection
───────────────────────────────────────────── */
export function DownloadsSection({
  kicker = "Downloads",
  title = "Resources for serious conversations.",
  copy = "Use the official documents when the website has done the first job and the next conversation needs more detail."
}) {
  return (
    <section className="section section--soft">
      <div className="container">
        <SectionHead kicker={kicker} title={title} copy={copy} light />
        <div className="downloads-grid-new">
          {site.downloads.map((item) => (
            <article className="download-card-new reveal-scroll" key={item.title}>
              <div className="download-card-new__label">{item.label}</div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <a className="button button--light" href={item.file} download>
                Download {item.title}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SHARED: FaqSection — Accordion style
───────────────────────────────────────────── */
export function FaqSection() {
  return (
    <section className="section section--light">
      <div className="container">
        <SectionHead kicker="FAQs" title="What people ask first." light />
        <div className="faq-accordion">
          {site.faqs.map((item) => (
            <details className="faq-item" key={item.title}>
              <summary>{item.title}</summary>
              <div className="faq-item__body">{item.copy}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOME: UniversitySection
───────────────────────────────────────────── */
export function UniversitySection() {
  return (
    <section className="section section--dark">
      <div className="container">
        <SectionHead
          kicker="Beyond high schools"
          title="Universities, colleges, and mega events."
          copy="Urban Gang Tour goes wherever young people are. The format scales from a single school to a campus-wide event or a county festival."
        />
        <div className="bento">
          {[
            { num: "01", title: "University and college stops", copy: "Campus events officers, student unions, and university administrators can bring Urban Gang Tour to their institution with a format built around their audience size and culture." },
            { num: "02", title: "Mega concerts and festivals", copy: "County events, public festivals, and large-scale activations. Urban Gang Tour brings the full production — hosts, DJs, talent lanes, pods, and Urban News coverage." },
            { num: "03", title: "Church and community events", copy: "Values-led organisations and faith communities can host a Urban Gang Tour stop that blends purpose, performance, and youth development in a single day." },
            { num: "04", title: "County and government activations", copy: "County officials and public agencies can partner with Urban Gang Tour to deliver youth programming with national broadcast reach and institutional credibility." },
          ].map((item, i) => (
            <article
              className={`proof-card-new reveal-scroll stagger-${i + 1}`}
              key={item.num}
              style={{ borderTopColor: PROOF_ACCENTS[i] }}
            >
              <div className="proof-card-new__num" style={{ color: PROOF_ACCENTS[i] }}>{item.num}</div>
              <h3 style={{ fontFamily: "var(--font-display-alt)", fontSize: "1.1rem", textTransform: "uppercase", marginBottom: "0.5rem", color: "var(--ugt-ink)" }}>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
        <div className="button-row" style={{ marginTop: "2rem" }}>
          <Link className="button button--light" href="/contact">Start a conversation</Link>
          <Link className="button button--ghost" href="/partners">See the partner story</Link>
        </div>
      </div>
    </section>
  );
}
