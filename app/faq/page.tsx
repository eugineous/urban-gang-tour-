import type { Metadata } from 'next';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'FAQ — Urban Gang Tour',
  description: 'Frequently asked questions about Urban Gang Tour events, tickets, merch, and more.',
  alternates: { canonical: `${SITE.domain}/faq` },
};

const FAQS = [
  {
    q: 'How do I buy tickets?',
    a: "Visit the Events page, select your event and ticket tier, pay via M-Pesa or card. You\u2019ll receive your e-ticket by email.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'M-Pesa (Safaricom) and debit/credit cards via Paystack.',
  },
  {
    q: 'Can I get a refund?',
    a: 'See our Refund Policy page for full details. Tickets are generally non-refundable except in the case of a cancelled event.',
  },
  {
    q: 'How do I verify my ticket?',
    a: 'Each ticket has a unique QR code. Present it at the gate — our team scans it on entry.',
  },
  {
    q: 'How do I perform at Urban Gang Tour?',
    a: 'Fill in the booking form on the Book Us page or contact us directly. We review all applications.',
  },
  {
    q: 'How can my school host Urban Gang Tour?',
    a: 'Reach out via the contact page or the booking form with your school name, dates, and expected attendance.',
  },
  {
    q: 'Where can I buy UGT merch?',
    a: 'Visit the Shop page. We offer delivery across Kenya.',
  },
  {
    q: 'How do I become an event organizer?',
    a: 'Apply via the Organizer portal at /organizer/signup. Your profile is reviewed before approval.',
  },
  {
    q: 'Do you have a mobile app?',
    a: 'UGT works as a Progressive Web App (PWA) — you can install it from your browser for a native-like experience.',
  },
  {
    q: 'How can I stay updated on new events?',
    a: 'Subscribe to our newsletter on the website, follow us on social media, or enable push notifications from your browser.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: a,
    },
  })),
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <main style={{ background: '#E6218C', minHeight: '60vh', padding: '52px 20px 90px' }}>
        <article style={{ maxWidth: 820, margin: '0 auto', background: '#fff', border: '3px solid #111', borderRadius: 18, boxShadow: '8px 8px 0 #111', padding: '34px 34px 44px' }}>
          <h1 style={{ fontFamily: "'Anton'", fontSize: 'clamp(28px,5vw,44px)', margin: '0 0 6px', textTransform: 'uppercase' }}>
            Frequently Asked Questions
          </h1>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 32 }}>
            Urban Gang Tour · admin@urbangangtour.co.ke
          </div>
          {FAQS.map(({ q, a }, i) => (
            <section key={i} style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 19, margin: '0 0 8px' }}>{q}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: '#222', margin: 0 }}>{a}</p>
            </section>
          ))}
        </article>
      </main>
    </>
  );
}
