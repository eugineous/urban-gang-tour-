// Branded, downloadable PDF versions of the two public bearer pages
// (/t/[code] and /receipt/[id]). Same @react-pdf/renderer conventions as
// lib/ops/pdf.tsx (BRAND palette, getLogoDataUri, standard 14 PDF fonts only
// - no custom font embedding, matching every other PDF this codebase ships).
//
// Security model (read this before changing anything below):
//   - The TKT- code is already tamper-evident (HMAC tag, lib/server/tickets.ts
//     codeAuthentic) and the gate scan (/api/tickets/verify) checks it live
//     against the database - that is what actually stops fraud (reuse,
//     revoked orders, refunds). A PDF file format cannot add security beyond
//     what a QR-scan-to-server already provides, because the whole point of
//     the file is that a stranger's phone can read it.
//   - What this file DOES add: a second, small, offline-verifiable signature
//     (signedTicketBlob) over the ticket's core facts, printed as a second QR
//     and duplicated into the PDF's Keywords metadata. A gate device that has
//     SESSION_SECRET but no signal at that instant can recompute the HMAC and
//     confirm the PRINTED facts were not edited after issuance. It cannot see
//     later state (used_at, refunds) - only a live scan does that.
import React from 'react';
import QRCode from 'qrcode';
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { orderLines } from '@/lib/server/catalog';
import { getEventMeta, getEventName, signedTicketBlob } from '@/lib/server/tickets';
import { BRAND } from '@/lib/ops/pdf';

const SITE = 'https://urbangangtour.co.ke';

const BIZ = {
  name: 'Urban Gang Tour',
  addr1: 'Chelezo Apartments, Kindaruma Road, Floor 15 Door 2',
  addr2: 'Kilimani, Nairobi',
  box: 'P.O. Box 6431 - 00622, Juja',
  phone: '+254 799 886247',
  email: 'admin@urbangangtour.co.ke',
  web: 'urbangangtour.co.ke',
};

function render(el: React.ReactElement): Promise<Buffer> {
  return renderToBuffer(el as React.ReactElement<any>);
}

function qrPng(text: string, dark = '#111111'): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 320, color: { dark, light: '#ffffff' } });
}

function fmtDate(v: unknown): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function fmtKes(n: number): string {
  return 'KES ' + Number(n || 0).toLocaleString('en-US');
}

// ---------------------------------------------------------------------- //
// TICKET PDF - dark card, same design language as the on-screen /t/[code]
// ---------------------------------------------------------------------- //

const tk = StyleSheet.create({
  page: { padding: 14, backgroundColor: '#0c0c0c', fontFamily: 'Helvetica', color: '#ffffff' },
  edge: { flex: 1, borderWidth: 3, borderColor: BRAND.magenta, borderRadius: 18, padding: 3 },
  card: { flex: 1, backgroundColor: '#111111', borderRadius: 15, borderWidth: 1, borderColor: BRAND.gold, padding: 0 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12 16 8' },
  logo: { width: 26, height: 26, objectFit: 'contain' },
  brand: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginLeft: 8 },
  ppp: { fontSize: 7, color: BRAND.gold, borderWidth: 1, borderColor: BRAND.gold, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
  rule: { height: 1.5, marginHorizontal: 16, backgroundColor: BRAND.gold },
  body: { padding: '12 18 4' },
  live: { fontSize: 7.5, letterSpacing: 2, color: '#9a9aa4', fontFamily: 'Helvetica-Bold' },
  compBadge: { alignSelf: 'flex-start', marginTop: 6, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111', backgroundColor: BRAND.gold, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8, letterSpacing: 0.5 },
  event: { fontFamily: 'Helvetica-Bold', fontSize: 22, textTransform: 'uppercase', color: '#ffffff', marginTop: 8, lineHeight: 1.05 },
  tier: { alignSelf: 'flex-start', marginTop: 10, fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#111111', backgroundColor: '#21C7E6', borderWidth: 1.5, borderColor: '#111111', borderRadius: 5, paddingVertical: 4, paddingHorizontal: 10, transform: 'rotate(-4deg)' },
  tierGold: { backgroundColor: BRAND.gold },
  meta: { fontSize: 10, color: '#d9d9de', marginTop: 10 },
  issuedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  lbl: { fontSize: 7, letterSpacing: 1.5, color: '#8a8a92', fontFamily: 'Helvetica-Bold' },
  holder: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', marginTop: 2 },
  pos: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#21C7E6', borderWidth: 1, borderColor: '#21C7E6', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  perf: { borderTopWidth: 1.5, borderTopColor: '#3a3a3a', borderStyle: 'dashed', marginTop: 12, marginHorizontal: 4 },
  stub: { flexDirection: 'row', alignItems: 'center', padding: '14 18 6', gap: 12 },
  admit: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRAND.gold, letterSpacing: 3 },
  qrWrap: { flex: 1, alignItems: 'center' },
  qrBox: { backgroundColor: '#ffffff', borderRadius: 8, padding: 8 },
  qr: { width: 130, height: 130 },
  scan: { fontSize: 6.5, letterSpacing: 1.5, color: '#8a8a92', fontFamily: 'Helvetica-Bold', marginTop: 6 },
  code: { textAlign: 'center', fontFamily: 'Courier-Bold', fontSize: 11, letterSpacing: 1.5, color: BRAND.gold, padding: '4 16 10' },
  verifyLine: { textAlign: 'center', fontSize: 7, color: '#8a8a92', paddingHorizontal: 20, paddingBottom: 10, lineHeight: 1.4 },
  secStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#2a2a2a', padding: '10 18' },
  secQr: { width: 40, height: 40, backgroundColor: '#ffffff', padding: 2, borderRadius: 4 },
  secText: { fontSize: 6.3, color: '#8a8a92', flex: 1, lineHeight: 1.5 },
  foot: { borderTopWidth: 1, borderTopColor: '#2a2a2a', padding: '10 18 12', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slogan: { fontFamily: 'Helvetica-BoldOblique', fontSize: 9, color: BRAND.gold },
  biz: { fontSize: 7, color: '#9a9aa2', textAlign: 'right', lineHeight: 1.5 },
});

export interface TicketPdfInput {
  code: string;
  eventId: string;
  tierName: string;
  holder: string;
  position: number;
  ofCount: number;
  createdAt: string | Date;
  orderId: string;
  payMethod: string;
  logo: string | null;
  qrMain: string; // data URI
  qrSig: string; // data URI
  // Resolved server-side (async, DB-backed) before this sync component
  // renders — see renderTicketPdf() below.
  evName: string;
  meta: { date: string; time: string; venue: string; city: string; accent: string } | undefined;
}

export function TicketPdf({ t }: { t: TicketPdfInput }) {
  const meta = t.meta;
  const evName = t.evName;
  const vip = /vip/i.test(t.tierName);
  const isComp = t.payMethod === 'comp';
  return (
    <Document title={`UGT Ticket ${t.code}`} author="Urban Gang Tour" keywords={`ugt-ticket-sig:${signedTicketBlob({ code: t.code, order_id: t.orderId, event_id: t.eventId, tier_name: t.tierName, created_at: t.createdAt })}`}>
      <Page size={[300, 760]} style={tk.page}>
        <View style={tk.edge}>
          <View style={tk.card}>
            <View style={tk.top}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {t.logo ? <Image style={tk.logo} src={t.logo} /> : null}
                <Text style={tk.brand}>URBAN GANG TOUR</Text>
              </View>
              <Text style={tk.ppp}>PPP TV KENYA</Text>
            </View>
            <View style={tk.rule} />
            <View style={tk.body}>
              <Text style={tk.live}>UGT LIVE  -  OFFICIAL E-TICKET</Text>
              {isComp ? <Text style={tk.compBadge}>COMPLIMENTARY TICKET</Text> : null}
              <Text style={tk.event}>{evName}</Text>
              <Text style={vip ? [tk.tier, tk.tierGold] as any : tk.tier}>{t.tierName}</Text>
              <Text style={tk.meta}>
                {meta ? `${meta.date} - ${meta.time} - ${meta.venue} - ${meta.city}` : 'Date & venue announced on urbangangtour.co.ke'}
              </Text>
              <View style={tk.issuedRow}>
                <View>
                  <Text style={tk.lbl}>ISSUED TO</Text>
                  <Text style={tk.holder}>{t.holder || 'Ticket Holder'}</Text>
                </View>
                <Text style={tk.pos}>{t.position} OF {t.ofCount}</Text>
              </View>
            </View>
            <View style={tk.perf} />
            <View style={tk.stub}>
              <Text style={tk.admit}>ADMIT{'\n'}ONE</Text>
              <View style={tk.qrWrap}>
                <View style={tk.qrBox}>
                  <Image style={tk.qr} src={t.qrMain} />
                </View>
                <Text style={tk.scan}>SCAN AT GATE</Text>
              </View>
            </View>
            <Text style={tk.code}>{t.code}</Text>
            <Text style={tk.verifyLine}>
              Verify instantly at urbangangtour.co.ke/t/{t.code} or by camera scan at the gate.
            </Text>
            <View style={tk.secStrip}>
              <Image style={tk.secQr} src={t.qrSig} />
              <Text style={tk.secText}>
                Offline-verifiable signature (HMAC-SHA256): confirms this PDF&apos;s printed
                details were not edited after issuance, even with no internet connection.
                Live gate scan still checks the database for use/refund status.
              </Text>
            </View>
            <View style={tk.foot}>
              <Text style={tk.slogan}>From Potential to Purpose</Text>
              <Text style={tk.biz}>urbangangtour.co.ke{'\n'}+254 799 886247</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderTicketPdf(input: {
  code: string; eventId: string; tierName: string; holder: string; position: number; ofCount: number;
  createdAt: string | Date; orderId: string; payMethod: string; logo: string | null;
}): Promise<Buffer> {
  const [qrMain, qrSig, evName, meta] = await Promise.all([
    qrPng(`${SITE}/t/${input.code}`),
    qrPng(signedTicketBlob({ code: input.code, order_id: input.orderId, event_id: input.eventId, tier_name: input.tierName, created_at: input.createdAt })),
    getEventName(input.eventId),
    getEventMeta(input.eventId),
  ]);
  return render(React.createElement(TicketPdf, { t: { ...input, qrMain, qrSig, evName, meta } }));
}

// ---------------------------------------------------------------------- //
// RECEIPT PDF - white document, same conventions as lib/ops/pdf.tsx
// ---------------------------------------------------------------------- //

const rc = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 60, paddingHorizontal: 40, fontSize: 10, fontFamily: 'Helvetica', color: BRAND.charcoal },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logo: { width: 56, height: 56, objectFit: 'contain', marginRight: 12 },
  brandName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: BRAND.charcoal },
  slogan: { fontSize: 9, color: BRAND.grey, marginTop: 2 },
  banner: { color: '#fff', fontSize: 11, fontFamily: 'Helvetica-Bold', borderRadius: 100, paddingVertical: 5, paddingHorizontal: 14 },
  accentBar: { height: 5, backgroundColor: BRAND.magenta, marginTop: 10, marginBottom: 3 },
  accentBar2: { height: 2, backgroundColor: BRAND.gold, marginBottom: 14 },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 },
  metaGrid: { marginTop: 8, marginBottom: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  metaLabel: { fontSize: 9.5, color: BRAND.grey },
  metaValue: { fontSize: 9.5, color: BRAND.charcoal, fontFamily: 'Helvetica-Bold' },
  section: { marginBottom: 12 },
  h2: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND.magenta, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  tableHead: { flexDirection: 'row', backgroundColor: BRAND.charcoal, color: '#fff', paddingVertical: 5, paddingHorizontal: 6 },
  row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#DDD' },
  rowAlt: { backgroundColor: BRAND.faint },
  cLabel: { flex: 5 },
  cQty: { flex: 1, textAlign: 'right' },
  cAmt: { flex: 2, textAlign: 'right' },
  cTotal: { flex: 2, textAlign: 'right' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, backgroundColor: BRAND.gold, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, textTransform: 'uppercase' },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 18 },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#DDD' },
  ticketCode: { fontFamily: 'Courier', fontSize: 8.5, color: BRAND.grey },
  footer: { position: 'absolute', left: 40, right: 40, bottom: 26 },
  footerBar: { height: 3, backgroundColor: BRAND.magenta, marginBottom: 6 },
  bizBlock: { fontSize: 8.5, color: BRAND.grey, lineHeight: 1.5, textAlign: 'center' },
  note: { fontSize: 9, color: BRAND.grey, marginTop: 8 },
});

const STATUS_BANNER: Record<string, { bg: string; label: string }> = {
  paid: { bg: BRAND.green, label: 'PAID' },
  fulfilled: { bg: BRAND.green, label: 'PAID' },
  failed: { bg: BRAND.red, label: 'NOT COMPLETED' },
};

export interface ReceiptPdfOrder {
  id: string;
  items: any;
  total: number;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
  pay_method?: string | null;
  mpesa_receipt?: string | null;
  paystack_ref?: string | null;
  stripe_payment_intent?: string | null;
  created_at?: string | Date | null;
}

export function ReceiptPdf({ order, logo, maskedPhone, tickets }: {
  order: ReceiptPdfOrder;
  logo: string | null;
  maskedPhone: string;
  tickets: { code: string; position: number; ofCount: number; tierName: string }[];
}) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const lines = orderLines(items || []);
  const isComp = order.pay_method === 'comp';
  const banner = STATUS_BANNER[String(order.status || '')] || { bg: BRAND.gold, label: 'PENDING' };
  const method = isComp ? 'Complimentary (no charge)' : order.pay_method === 'card' ? 'Card' : 'M-Pesa';
  const reference = String(order.mpesa_receipt || order.paystack_ref || order.stripe_payment_intent || '');
  return (
    <Document title={`UGT Receipt ${order.id}`} author="Urban Gang Tour">
      <Page size="A4" style={rc.page}>
        <View style={rc.headerRow}>
          {logo ? <Image style={rc.logo} src={logo} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={rc.brandName}>URBAN GANG TOUR</Text>
            <Text style={rc.slogan}>From Potential to Purpose</Text>
          </View>
          <Text style={[rc.banner, { backgroundColor: isComp ? BRAND.gold : banner.bg, color: isComp ? '#111' : '#fff' }]}>
            {isComp ? 'PAID - COMPLIMENTARY' : banner.label}
          </Text>
        </View>
        <View style={rc.accentBar} />
        <View style={rc.accentBar2} />
        <Text style={rc.docTitle}>Official Receipt</Text>
        <View style={rc.metaGrid}>
          <View style={rc.metaRow}><Text style={rc.metaLabel}>Receipt / Order No.</Text><Text style={rc.metaValue}>{order.id}</Text></View>
          {reference ? <View style={rc.metaRow}><Text style={rc.metaLabel}>Payment reference</Text><Text style={rc.metaValue}>{reference}</Text></View> : null}
          <View style={rc.metaRow}><Text style={rc.metaLabel}>Date</Text><Text style={rc.metaValue}>{fmtDate(order.created_at) || fmtDate(new Date())}</Text></View>
          <View style={rc.metaRow}><Text style={rc.metaLabel}>Payment method</Text><Text style={rc.metaValue}>{method}</Text></View>
          {order.name ? <View style={rc.metaRow}><Text style={rc.metaLabel}>Billed to</Text><Text style={rc.metaValue}>{order.name}{maskedPhone ? ` (${maskedPhone})` : ''}</Text></View> : null}
        </View>
        <View style={rc.section}>
          <View style={rc.tableHead}>
            <Text style={rc.cLabel}>Description</Text>
            <Text style={rc.cQty}>Qty</Text>
            <Text style={rc.cAmt}>Unit (KES)</Text>
            <Text style={rc.cTotal}>Amount (KES)</Text>
          </View>
          {lines.map((l, i) => (
            <View key={i} style={i % 2 ? [rc.row, rc.rowAlt] : rc.row}>
              <Text style={rc.cLabel}>{l.name}</Text>
              <Text style={rc.cQty}>{String(l.qty)}</Text>
              <Text style={rc.cAmt}>{isComp ? 'FREE' : Math.round(l.unit || 0).toLocaleString('en-KE')}</Text>
              <Text style={rc.cTotal}>{isComp ? 'FREE' : Math.round(l.total || 0).toLocaleString('en-KE')}</Text>
            </View>
          ))}
        </View>
        <View style={rc.totalBox}>
          <Text style={rc.totalLabel}>{isComp ? 'Complimentary' : 'Total'}</Text>
          <Text style={rc.totalValue}>{isComp ? 'KES 0' : fmtKes(Number(order.total) || 0)}</Text>
        </View>
        {isComp ? (
          <Text style={rc.note}>Issued free of charge by Urban Gang Tour admin. This is not a paid transaction - KES 0 due.</Text>
        ) : null}
        {tickets.length ? (
          <View style={[rc.section, { marginTop: 14 }]}>
            <Text style={rc.h2}>Your e-tickets</Text>
            {tickets.map((t) => (
              <View key={t.code} style={rc.ticketRow}>
                <Text>Ticket {t.position} of {t.ofCount} - {t.tierName}</Text>
                <Text style={rc.ticketCode}>{t.code}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={rc.footer} fixed>
          <View style={rc.footerBar} />
          <Text style={rc.bizBlock}>
            {BIZ.name} - {BIZ.addr1}, {BIZ.addr2} - {BIZ.box}{'\n'}
            {BIZ.phone} - {BIZ.email} - {BIZ.web}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(order: ReceiptPdfOrder, logo: string | null, maskedPhone: string, tickets: { code: string; position: number; ofCount: number; tierName: string }[]): Promise<Buffer> {
  return render(React.createElement(ReceiptPdf, { order, logo, maskedPhone, tickets }));
}
