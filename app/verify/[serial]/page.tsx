import { Fragment } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocumentBySerial, ensureDocgenSchema, DOC_TYPES } from '@/lib/server/docgen';

// Public document verification page - the target of every serialised doc's QR
// code. Roles: public (anon). The serial is the bearer token; the page shows
// only the type, issued-to name, event and issue date plus a big VALID / VOID
// badge - never any financial figures, line items or contact info. Server-
// rendered on every request (void status must be live), noindexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verify Document | Urban Gang Tour',
  description: 'Verify the authenticity of an Urban Gang Tour document.',
  robots: { index: false, follow: false },
};

const SERIAL_RE = /^UGT-[A-Z]{2,6}-\d{2}-\d{3,6}$/;

async function lookup(serial: string) {
  try {
    await ensureDocgenSchema();
    return await getDocumentBySerial(serial);
  } catch {
    return null;
  }
}

function fmtDate(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });
}

export default async function VerifyPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial: rawSerial } = await params;
  const serial = decodeURIComponent(rawSerial || '').toUpperCase();
  if (!SERIAL_RE.test(serial)) notFound();
  const doc = await lookup(serial);
  if (!doc) notFound();

  const valid = doc.status !== 'void';
  const typeLabel = DOC_TYPES[doc.type]?.label || doc.type;
  const badge = valid ? { bg: '#1F8A5B', label: 'VALID', mark: '✓' } : { bg: '#C62828', label: 'VOID', mark: '✗' };

  const anton = "'Anton','Arial Black',sans-serif";
  const grotesk = "'Space Grotesk',Arial,sans-serif";

  const rows: Array<[string, string]> = [
    ['Document type', typeLabel],
    ['Serial number', doc.serial],
    ['Issued to', doc.issued_to || '-'],
  ];
  if (doc.event) rows.push(['Event / Reference', doc.event]);
  rows.push(['Date issued', fmtDate(doc.created_at)]);
  if (!valid && doc.void_reason) rows.push(['Void reason', doc.void_reason]);

  return (
    <div style={{ minHeight: '100vh', background: '#1a0c13', padding: '40px 16px', fontFamily: grotesk, color: '#111', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;600;700&display=swap');`}</style>
      <div style={{ maxWidth: 520, width: '100%', background: '#fff', border: '3px solid #111', borderRadius: 18, overflow: 'hidden', boxShadow: '10px 10px 0 rgba(0,0,0,.4)' }}>
        <div style={{ background: '#111', padding: '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/ugt-logo-v2.png" alt="Urban Gang Tour" style={{ height: 42, width: 'auto' }} />
            <div>
              <div style={{ fontFamily: anton, fontSize: 11, letterSpacing: '.06em', color: '#FFD400', textTransform: 'uppercase' }}>Urban Gang Tour</div>
              <div style={{ fontFamily: anton, fontSize: 20, color: '#fff', textTransform: 'uppercase', lineHeight: 1.1 }}>Document Check</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', height: 6 }}>
          <span style={{ flex: 2, background: '#E6218C' }} />
          <span style={{ flex: 1, background: '#FFD400' }} />
          <span style={{ flex: 1, background: '#21C7E6' }} />
        </div>
        <div style={{ background: badge.bg, color: '#fff', textAlign: 'center', padding: '26px 20px' }}>
          <div style={{ fontSize: 46, lineHeight: 1, fontWeight: 700 }}>{badge.mark}</div>
          <div style={{ fontFamily: anton, fontSize: 40, letterSpacing: '.04em', marginTop: 6 }}>{badge.label}</div>
          <div style={{ fontSize: 13, marginTop: 6, opacity: 0.92 }}>
            {valid ? 'This is a genuine Urban Gang Tour document.' : 'This document has been cancelled and is no longer valid.'}
          </div>
        </div>
        <div style={{ padding: '22px 26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 11, columnGap: 14, fontSize: 14, color: '#555' }}>
            {rows.map(([k, v]) => (
              <Fragment key={k}>
                <span>{k}</span>
                <span style={{ fontWeight: 700, color: '#111', textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
              </Fragment>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '2px dashed #ddd', padding: '16px 26px', fontSize: 11.5, color: '#666', lineHeight: 1.7 }}>
          Verified against Urban Gang Tour's official records. If the details above do not match the document in your hand, do not act on it - contact <strong style={{ color: '#111' }}>admin@urbangangtour.co.ke</strong>.
        </div>
        <div style={{ background: '#111', color: '#FFD400', textAlign: 'center', padding: 12, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          urbangangtour.co.ke
        </div>
      </div>
    </div>
  );
}
