import {DocumentLabel,DocumentStatus} from '@/app/_components/PrintDocumentButton';
import LanguageChooser from '@/app/_components/LanguageChooser';
import {MessageText} from '@/ui/i18n/MessageText';
import {documentsMessages} from '@/ui/i18n/catalogues/documents';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocumentBySerial, ensureDocgenSchema, DOC_TYPES, isOperationalDoc } from '@/lib/server/docgen';

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
  if (!doc || isOperationalDoc(doc.type)) notFound();

  const valid = doc.status !== 'void';
  const typeLabel = DOC_TYPES[doc.type]?.label || doc.type;

  const rows: Array<[string, string]> = [
    ['Document type', typeLabel],
    ['Serial number', doc.serial],
    ['Issued to', doc.issued_to || '-'],
  ];
  if (doc.event) rows.push(['Event / Reference', doc.event]);
  rows.push(['Date issued', fmtDate(doc.created_at)]);
  if (!valid && doc.void_reason) rows.push(['Void reason', doc.void_reason]);

  return <section className="document-stage"><div className="no-print"><LanguageChooser path="/documents"/></div><article className="document-card"><a className="document-brand" href="/"><img src="/assets/ugt-logo.png" alt="Urban Gang Tour" width={72}/><span><MessageText catalogue={documentsMessages} message="copy.document_verification"/></span></a><p className={`document-status ${valid?'valid':'void'}`} role="status">{valid?<MessageText catalogue={documentsMessages} message="copy.verified_document"/>:<MessageText catalogue={documentsMessages} message="copy.document_cancelled"/>}</p><h1>{typeLabel}</h1><p>{valid?<MessageText catalogue={documentsMessages} message="copy.this_document_matches_our_official_records"/>:<MessageText catalogue={documentsMessages} message="copy.this_document_is_no_longer_valid"/>}</p><dl className="document-details">{rows.map(([k,v])=><div key={String(k)}><dt><DocumentLabel label={k}/></dt><dd lang="en-KE">{v}</dd></div>)}</dl><p className="document-note"><span lang="en-KE">Check these details against the document in your hand. If they differ, contact </span><a href="mailto:admin@urbangangtour.co.ke"><span lang="en-KE">admin@urbangangtour.co.ke</span></a><MessageText catalogue={documentsMessages} message="copy."/></p><a className="button" href="/"><MessageText catalogue={documentsMessages} message="copy.back_to_urban_gang_tour"/></a></article></section>;
}
