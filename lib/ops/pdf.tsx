// UGT branded PDF templates (server only, @react-pdf/renderer).
// One brand template, two render paths:
//   - OUTBOUND (quote / invoice / receipt): bill-to, line items, totals, terms,
//     payment details. NEVER any internal cost data (crew pay, teacher cut,
//     margins) - schools and sponsors see this.
//   - INTERNAL (budget sheet, event financial report): full detail, clearly
//     stamped INTERNAL.
// All money figures are computed from inputs at render time via budget-calc.
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BudgetData, computeBudget, docTotals, fmtKES, DocLine,
} from './budget-calc';

const BRAND = {
  magenta: '#C7238E',
  charcoal: '#26262B',
  gold: '#E8A33D',
  grey: '#6B6B72',
  faint: '#F4EFF2',
  red: '#C0392B',
  green: '#1F8A5B',
};

const CONTACT_LINE = 'Urban Gang Tour | urbangangtour.co.ke | admin@urbangangtour.co.ke | Nairobi, Kenya';

const st = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 64, paddingHorizontal: 40, fontSize: 10, fontFamily: 'Helvetica', color: BRAND.charcoal },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logo: { width: 64, height: 64, objectFit: 'contain', marginRight: 12 },
  brandName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: BRAND.charcoal },
  slogan: { fontSize: 9, color: BRAND.grey, marginTop: 2 },
  accentBar: { height: 5, backgroundColor: BRAND.magenta, marginBottom: 3 },
  accentBar2: { height: 2, backgroundColor: BRAND.gold, marginBottom: 14 },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 14 },
  metaText: { fontSize: 9, color: BRAND.grey },
  section: { marginBottom: 12 },
  h2: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND.magenta, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  tableHead: { flexDirection: 'row', backgroundColor: BRAND.charcoal, color: '#fff', paddingVertical: 5, paddingHorizontal: 6 },
  row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#DDD' },
  rowAlt: { backgroundColor: BRAND.faint },
  cLabel: { flex: 5 },
  cQty: { flex: 1, textAlign: 'right' },
  cAmt: { flex: 2, textAlign: 'right' },
  cTotal: { flex: 2, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 3, paddingHorizontal: 6 },
  totalLabel: { width: 160, textAlign: 'right', marginRight: 12, color: BRAND.grey },
  totalValue: { width: 90, textAlign: 'right' },
  grand: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: BRAND.magenta },
  footer: { position: 'absolute', left: 40, right: 40, bottom: 26 },
  footerBar: { height: 3, backgroundColor: BRAND.magenta, marginBottom: 6 },
  footerText: { fontSize: 8, color: BRAND.grey, textAlign: 'center' },
  internalStamp: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRAND.red, textTransform: 'uppercase', letterSpacing: 1 },
  warn: { backgroundColor: '#FBE9E7', borderLeftWidth: 3, borderLeftColor: BRAND.red, padding: 6, marginTop: 6, fontSize: 9, color: BRAND.red },
  note: { fontSize: 9, color: BRAND.grey, marginTop: 2 },
});

// Logo resolution: local file first (works in dev and when Vercel traces the
// literal path), live site as fallback (assets are cached immutable), no logo
// as the final fallback - the PDF must always render.
let logoCache: string | null | undefined;
export async function getLogoDataUri(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const buf = await readFile(path.join(process.cwd(), 'public', 'assets', 'ugt-logo-v2.png'));
    logoCache = 'data:image/png;base64,' + buf.toString('base64');
    return logoCache;
  } catch { /* fall through */ }
  try {
    const r = await fetch('https://urbangangtour.co.ke/assets/ugt-logo-v2.png');
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      logoCache = 'data:image/png;base64,' + buf.toString('base64');
      return logoCache;
    }
  } catch { /* fall through */ }
  logoCache = null;
  return null;
}

function fmtDate(v: unknown): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function Header({ logo, title, docNumber, date, internal }: { logo: string | null; title: string; docNumber: string; date: string; internal?: boolean }) {
  return (
    <View>
      <View style={st.headerRow}>
        {logo ? <Image style={st.logo} src={logo} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={st.brandName}>URBAN GANG TOUR</Text>
          <Text style={st.slogan}>From Potential to Purpose</Text>
        </View>
        {internal ? <Text style={st.internalStamp}>Internal - not for circulation</Text> : null}
      </View>
      <View style={st.accentBar} />
      <View style={st.accentBar2} />
      <Text style={st.docTitle}>{title}</Text>
      <View style={st.metaRow}>
        <Text style={st.metaText}>{docNumber}</Text>
        <Text style={st.metaText}>Date: {date}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={st.footer} fixed>
      <View style={st.footerBar} />
      <Text style={st.footerText}>{CONTACT_LINE}</Text>
    </View>
  );
}

function MoneyRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  const extra = bold ? st.grand : {};
  return (
    <View style={st.totalRow}>
      <Text style={[st.totalLabel, bold ? { color: BRAND.charcoal, fontFamily: 'Helvetica-Bold' } : {}]}>{label}</Text>
      <Text style={[st.totalValue, extra, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ---------------- OUTBOUND: quote / invoice / receipt ----------------

export interface OutboundDoc {
  doc_type: string;
  doc_number: string;
  bill_to: { name?: string; org?: string; phone?: string; email?: string; address?: string };
  lines: DocLine[];
  payment_terms: string;
  due_date: unknown;
  pay_details: string;
  notes: string;
  created_at: unknown;
  paid?: number;
}

const DOC_TITLES: Record<string, string> = { quote: 'Quotation', invoice: 'Invoice', receipt: 'Receipt' };

export function OutboundPdf({ doc, logo }: { doc: OutboundDoc; logo: string | null }) {
  const lines = doc.lines || [];
  const { total } = docTotals(lines);
  const paid = Number(doc.paid || 0);
  const balance = total - paid;
  const b = doc.bill_to || {};
  return (
    <Document title={doc.doc_number} author="Urban Gang Tour">
      <Page size="A4" style={st.page}>
        <Header logo={logo} title={DOC_TITLES[doc.doc_type] || doc.doc_type} docNumber={doc.doc_number} date={fmtDate(doc.created_at) || fmtDate(new Date())} />
        <View style={st.section}>
          <Text style={st.h2}>Bill to</Text>
          {b.name ? <Text>{b.name}</Text> : null}
          {b.org ? <Text>{b.org}</Text> : null}
          {b.address ? <Text>{b.address}</Text> : null}
          {b.phone ? <Text>{b.phone}</Text> : null}
          {b.email ? <Text>{b.email}</Text> : null}
        </View>
        <View style={st.section}>
          <View style={st.tableHead}>
            <Text style={st.cLabel}>Description</Text>
            <Text style={st.cQty}>Qty</Text>
            <Text style={st.cAmt}>Unit (KES)</Text>
            <Text style={st.cTotal}>Amount (KES)</Text>
          </View>
          {lines.map((l, i) => (
            <View key={i} style={i % 2 ? [st.row, st.rowAlt] : st.row}>
              <Text style={st.cLabel}>{l.label}</Text>
              <Text style={st.cQty}>{String(l.qty)}</Text>
              <Text style={st.cAmt}>{Math.round(Number(l.amount) || 0).toLocaleString('en-KE')}</Text>
              <Text style={st.cTotal}>{Math.round((Number(l.qty) || 0) * (Number(l.amount) || 0)).toLocaleString('en-KE')}</Text>
            </View>
          ))}
          <MoneyRow label="Total" value={fmtKES(total)} bold />
          {doc.doc_type === 'invoice' && paid > 0 ? <MoneyRow label="Paid to date" value={fmtKES(paid)} /> : null}
          {doc.doc_type === 'invoice' && paid > 0 ? <MoneyRow label="Balance due" value={fmtKES(balance)} bold color={balance > 0 ? BRAND.red : BRAND.green} /> : null}
        </View>
        {doc.doc_type === 'invoice' && doc.due_date ? (
          <View style={st.section}><Text style={st.h2}>Due date</Text><Text>{fmtDate(doc.due_date)}</Text></View>
        ) : null}
        {doc.payment_terms ? (
          <View style={st.section}><Text style={st.h2}>Terms</Text><Text>{doc.payment_terms}</Text></View>
        ) : null}
        {doc.pay_details ? (
          <View style={st.section}><Text style={st.h2}>Payment details</Text><Text>{doc.pay_details}</Text></View>
        ) : null}
        {doc.notes ? (
          <View style={st.section}><Text style={st.h2}>Notes</Text><Text>{doc.notes}</Text></View>
        ) : null}
        {doc.doc_type === 'receipt' ? <Text style={st.note}>Thank you. This receipt confirms the payment above.</Text> : null}
        <Footer />
      </Page>
    </Document>
  );
}

// ---------------- INTERNAL: budget sheet ----------------

export function BudgetSheetPdf({ data, eventName, version, createdAt, logo }: { data: BudgetData; eventName: string; version: number; createdAt: unknown; logo: string | null }) {
  const r = computeBudget(data);
  return (
    <Document title={`Budget v${version} - ${eventName}`} author="Urban Gang Tour">
      <Page size="A4" style={st.page}>
        <Header logo={logo} title="Internal budget sheet" docNumber={`${eventName} - version ${version}`} date={fmtDate(createdAt) || fmtDate(new Date())} internal />
        <View style={st.section}>
          <Text style={st.h2}>Event</Text>
          <Text>{data.eventName || eventName}</Text>
          {data.school ? <Text>School: {data.school}</Text> : null}
          {data.eventDate ? <Text>Date: {data.eventDate}</Text> : null}
          <Text>Distance band: {data.distanceBand} | Expected income: {fmtKES(data.expectedIncome)} | Students: {data.studentCount ?? 'TBD'}</Text>
        </View>
        <View style={st.section}>
          <View style={st.tableHead}>
            <Text style={st.cLabel}>Production line</Text>
            <Text style={st.cTotal}>Amount (KES)</Text>
          </View>
          {r.costLines.map((l, i) => (
            <View key={i} style={i % 2 ? [st.row, st.rowAlt] : st.row}>
              <Text style={st.cLabel}>{l.label}</Text>
              <Text style={[st.cTotal, l.tbd ? { color: BRAND.gold, fontFamily: 'Helvetica-Bold' } : {}]}>{l.tbd ? 'TBD' : Math.round(l.amount || 0).toLocaleString('en-KE')}</Text>
            </View>
          ))}
          {r.tbdCount > 0 ? (
            <View style={st.warn}><Text>{r.tbdCount} line(s) are TBD and are EXCLUDED from every total below.</Text></View>
          ) : null}
        </View>
        <View style={st.section}>
          <MoneyRow label="Production cost" value={fmtKES(r.productionCost)} />
          <MoneyRow label={`Crew pay (${data.crewCount} x ${fmtKES(data.crewRate)})`} value={fmtKES(r.crewPay)} />
          <MoneyRow label={`Teacher cut (${r.teacherPct}% of income)`} value={fmtKES(r.teacherCut)} />
          <MoneyRow label={`Contingency (${r.contingencyPct}% of production)`} value={fmtKES(r.contingency)} />
          <MoneyRow label="Grand total" value={fmtKES(r.grandTotal)} bold />
          <MoneyRow label="Expected income" value={fmtKES(r.income)} />
          <MoneyRow label={r.profit >= 0 ? 'Projected profit' : 'Projected loss'} value={fmtKES(r.profit)} bold color={r.profitTone === 'green' ? BRAND.green : r.profitTone === 'orange' ? BRAND.gold : BRAND.red} />
          {r.perStudent !== null ? <MoneyRow label="Per student (ref band 200 to 500)" value={fmtKES(r.perStudent)} /> : null}
          {r.partnerSaving > 0 ? <MoneyRow label="Partner sound saving" value={fmtKES(r.partnerSaving)} color={BRAND.green} /> : null}
        </View>
        {r.crewFundingShortfall ? (
          <View style={st.warn}><Text>This deal cannot fund crew pay at this rate. Shortfall: {fmtKES(Math.abs(r.crewFundingHeadroom))}.</Text></View>
        ) : null}
        <Footer />
      </Page>
    </Document>
  );
}

// ---------------- INTERNAL: event financial report ----------------

export interface EventReportInput {
  event: { name: string; school: string; event_date: unknown; agreed_amount: number | null; status: string };
  budget: { version: number; data: BudgetData } | null;
  payments: Array<{ amount: number; paid_on: unknown; method: string; reference: string }>;
  payouts: Array<{ person: string; role: string; amount: number; paid: boolean; paid_on: unknown }>;
  expenses: Array<{ label: string; category: string; amount: number; spent_on: unknown }>;
}

export function EventReportPdf({ input, logo }: { input: EventReportInput; logo: string | null }) {
  const { event, budget, payments, payouts, expenses } = input;
  const r = budget ? computeBudget(budget.data) : null;
  const received = payments.reduce((s2, p) => s2 + Number(p.amount || 0), 0);
  const crewPaid = payouts.filter((p) => p.paid).reduce((s2, p) => s2 + Number(p.amount || 0), 0);
  const crewPlanned = payouts.reduce((s2, p) => s2 + Number(p.amount || 0), 0);
  const spent = expenses.reduce((s2, e) => s2 + Number(e.amount || 0), 0);
  const actualOut = spent + crewPaid;
  return (
    <Document title={`Event report - ${event.name}`} author="Urban Gang Tour">
      <Page size="A4" style={st.page}>
        <Header logo={logo} title="Event financial report" docNumber={event.name} date={fmtDate(new Date())} internal />
        <View style={st.section}>
          <Text style={st.h2}>Event</Text>
          <Text>{event.name}{event.school ? ' - ' + event.school : ''}</Text>
          <Text>Date: {fmtDate(event.event_date) || 'TBD'} | Status: {event.status}</Text>
        </View>
        <View style={st.section}>
          <Text style={st.h2}>Money summary</Text>
          <MoneyRow label="Agreed amount" value={event.agreed_amount != null ? fmtKES(event.agreed_amount) : 'TBD'} />
          <MoneyRow label="Income received" value={fmtKES(received)} bold color={BRAND.green} />
          <MoneyRow label={budget ? `Budget grand total (v${budget.version})` : 'Budget grand total'} value={r ? fmtKES(r.grandTotal) : 'No budget saved'} />
          <MoneyRow label="Expenses recorded" value={fmtKES(spent)} />
          <MoneyRow label="Crew paid / planned" value={`${fmtKES(crewPaid)} / ${fmtKES(crewPlanned)}`} />
          <MoneyRow label="Actual out (expenses + crew paid)" value={fmtKES(actualOut)} />
          <MoneyRow label="Net so far (received minus actual out)" value={fmtKES(received - actualOut)} bold color={received - actualOut >= 0 ? BRAND.green : BRAND.red} />
        </View>
        {payments.length ? (
          <View style={st.section}>
            <Text style={st.h2}>Payments received</Text>
            <View style={st.tableHead}>
              <Text style={st.cLabel}>Date / method / reference</Text>
              <Text style={st.cTotal}>Amount (KES)</Text>
            </View>
            {payments.map((p, i) => (
              <View key={i} style={i % 2 ? [st.row, st.rowAlt] : st.row}>
                <Text style={st.cLabel}>{fmtDate(p.paid_on)} | {p.method}{p.reference ? ' | ' + p.reference : ''}</Text>
                <Text style={st.cTotal}>{Math.round(Number(p.amount) || 0).toLocaleString('en-KE')}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {payouts.length ? (
          <View style={st.section}>
            <Text style={st.h2}>Crew payouts</Text>
            <View style={st.tableHead}>
              <Text style={st.cLabel}>Person / role / status</Text>
              <Text style={st.cTotal}>Amount (KES)</Text>
            </View>
            {payouts.map((p, i) => (
              <View key={i} style={i % 2 ? [st.row, st.rowAlt] : st.row}>
                <Text style={st.cLabel}>{p.person}{p.role ? ' | ' + p.role : ''} | {p.paid ? 'paid ' + fmtDate(p.paid_on) : 'pending'}</Text>
                <Text style={st.cTotal}>{Math.round(Number(p.amount) || 0).toLocaleString('en-KE')}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {expenses.length ? (
          <View style={st.section}>
            <Text style={st.h2}>Expenses</Text>
            <View style={st.tableHead}>
              <Text style={st.cLabel}>Date / category / item</Text>
              <Text style={st.cTotal}>Amount (KES)</Text>
            </View>
            {expenses.map((e, i) => (
              <View key={i} style={i % 2 ? [st.row, st.rowAlt] : st.row}>
                <Text style={st.cLabel}>{fmtDate(e.spent_on)} | {e.category} | {e.label}</Text>
                <Text style={st.cTotal}>{Math.round(Number(e.amount) || 0).toLocaleString('en-KE')}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Footer />
      </Page>
    </Document>
  );
}
