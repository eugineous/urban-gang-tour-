// Document Generator engine (phases 1-2: invoice + receipt).
//
// The SERVER owns all data integrity: gapless per-type serials, computed
// totals, amount-in-words, QR, and the immutable ug_documents record. It
// returns the FILLED template HTML (brand template read from
// public/doc-templates, values injected into the [data-field] blanks that
// public/doc-templates/26-invoice-a4.html + 27-receipt-a5-slip.html were
// stamped with). The CLIENT rasterises those pixels (html-to-image + jspdf)
// so no serverless headless Chrome is ever needed.
//
// Adding a new doc type later (certificate, call sheet, budget, ticket,
// proposal, promo): add one entry to DOC_TYPES (code + template file) and one
// buildValues() branch mapping its schema fields to the template's
// data-field names. The serial counter, QR, verify page, immutable record,
// void/list and the whole client render path are type-agnostic and need no
// change. Batch types (certificates/tickets) loop nextSerial()+insert per row.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { db, q } from './db';

// ---------------------------------------------------------------------------
// Schema (self-healing, mirrors lib/server/ops.ts's ensureOpsSchema pattern).
// A module owning its own ensure() is the established convention here
// (admin-accounts.ts does the same). Called at the top of every docs route.
// ---------------------------------------------------------------------------
export const DOCGEN_SCHEMA = `
CREATE TABLE IF NOT EXISTS ug_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  serial TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  issued_to TEXT DEFAULT '',
  event TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'final',
  pdf_url TEXT DEFAULT '',
  png_url TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  voided_at TIMESTAMPTZ,
  void_reason TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS ug_doc_serials (
  type TEXT PRIMARY KEY,
  year INT NOT NULL,
  seq INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ug_documents_serial ON ug_documents (serial);
CREATE INDEX IF NOT EXISTS idx_ug_documents_type ON ug_documents (type);
CREATE INDEX IF NOT EXISTS idx_ug_documents_created_at ON ug_documents (created_at DESC);
`;

let ensured: Promise<void> | null = null;
export function ensureDocgenSchema(): Promise<void> {
  if (!db()) return Promise.reject(new Error('db_not_configured'));
  if (!ensured) {
    ensured = q(DOCGEN_SCHEMA).then(() => undefined).catch((e) => {
      ensured = null; // allow retry on the next request
      throw e;
    });
  }
  return ensured;
}

// ---------------------------------------------------------------------------
// Doc-type registry. code -> serial TYPE code; template -> file in
// public/doc-templates. Only invoice + receipt are wired this phase; the rest
// are the reserved codes from the spec so future phases slot in without
// renumbering anything already issued.
// ---------------------------------------------------------------------------
export interface DocTypeDef { code: string; label: string; template: string; }
export const DOC_TYPES: Record<string, DocTypeDef> = {
  invoice: { code: 'INV', label: 'Invoice', template: '26-invoice-a4.html' },
  receipt: { code: 'RCT', label: 'Receipt', template: '27-receipt-a5-slip.html' },
  certw: { code: 'CERTW', label: 'Winner Certificate', template: '07-certificate-winner.html' },
  certp: { code: 'CERTP', label: 'Participation Certificate', template: '08-certificate-participation.html' },
};
export const ACTIVE_DOC_TYPES = ['invoice', 'receipt', 'certw', 'certp'] as const;
export type DocType = (typeof ACTIVE_DOC_TYPES)[number];

export function isDocType(v: unknown): v is DocType {
  return typeof v === 'string' && (ACTIVE_DOC_TYPES as readonly string[]).includes(v);
}

export const VERIFY_BASE = 'https://urbangangtour.co.ke/verify/';

// ---------------------------------------------------------------------------
// Gapless, race-safe serials: UGT-{CODE}-{YY}-{0001}, per type + calendar
// year. The counter bump and the caller's INSERT must share ONE transaction so
// a failed insert rolls the number back and none is ever burned - so
// nextSerial() runs INSIDE a transaction the caller opens (see insertDocument).
// Concurrent generates serialise on the UPDATE row lock.
// ---------------------------------------------------------------------------
async function bumpSerial(client: any, type: DocType): Promise<string> {
  const def = DOC_TYPES[type];
  if (!def) throw new Error('bad_doc_type');
  const year = new Date().getFullYear();
  await client.query(
    `INSERT INTO ug_doc_serials (type, year, seq) VALUES ($1,$2,0)
     ON CONFLICT (type) DO UPDATE SET year = CASE WHEN ug_doc_serials.year <> $2 THEN $2 ELSE ug_doc_serials.year END,
                                       seq  = CASE WHEN ug_doc_serials.year <> $2 THEN 0 ELSE ug_doc_serials.seq END`,
    [type, year]
  );
  const r = await client.query(
    `UPDATE ug_doc_serials SET seq = seq + 1 WHERE type = $1 RETURNING seq, year`,
    [type]
  );
  const { seq, year: yr } = r.rows[0];
  const yy = String(yr).slice(-2);
  return `UGT-${def.code}-${yy}-${String(seq).padStart(4, '0')}`;
}

// Standalone helper for callers/tests that just want the next serial value
// (still transactional + gapless). Production generate uses insertDocument()
// which bumps + inserts atomically.
export async function nextSerial(type: DocType): Promise<string> {
  const pool = db();
  if (!pool) throw new Error('db_not_configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const serial = await bumpSerial(client, type);
    await client.query('COMMIT');
    return serial;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Amount in words (Kenyan Shillings). Whole shillings; cents only when
// non-zero -> "... and 50 Cents". Handles up to hundreds of billions.
// ---------------------------------------------------------------------------
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function threeDigitWords(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(ONES[h] + ' Hundred');
  if (rest) {
    if (rest < 20) parts.push(ONES[rest]);
    else {
      const t = Math.floor(rest / 10), o = rest % 10;
      parts.push(o ? TENS[t] + '-' + ONES[o] : TENS[t]);
    }
  }
  return parts.join(' ');
}

function intToWords(n: number): string {
  if (n === 0) return 'Zero';
  const groups: number[] = [];
  let x = n;
  while (x > 0) { groups.push(x % 1000); x = Math.floor(x / 1000); }
  const out: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    out.push(threeDigitWords(groups[i]) + (SCALES[i] ? ' ' + SCALES[i] : ''));
  }
  return out.join(' ');
}

export function numberToWords(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return '';
  const shillings = Math.floor(n);
  const cents = Math.round((n - shillings) * 100);
  let words = intToWords(shillings) + ' Shilling' + (shillings === 1 ? '' : 's');
  if (cents > 0) words += ' and ' + intToWords(cents) + ' Cent' + (cents === 1 ? '' : 's');
  return words + ' Only';
}

// ---------------------------------------------------------------------------
// Server-authoritative invoice totals. Client-sent totals are never trusted:
// subtotal is recomputed from qty*rate, discount is clamped to [0, subtotal].
// ---------------------------------------------------------------------------
export interface LineItem { description: string; qty: number; rate: number; }
export interface InvoiceTotals { subtotal: number; discount: number; total: number; }

export function computeInvoiceTotals(lineItems: LineItem[], discount: number): InvoiceTotals {
  const items = Array.isArray(lineItems) ? lineItems : [];
  let subtotal = 0;
  for (const it of items) {
    const qty = Math.max(0, Math.round(Number(it?.qty) || 0));
    const rate = Math.max(0, Math.round(Number(it?.rate) || 0));
    subtotal += qty * rate;
  }
  let disc = Math.max(0, Math.round(Number(discount) || 0));
  if (disc > subtotal) disc = subtotal;
  return { subtotal, discount: disc, total: subtotal - disc };
}

// ---------------------------------------------------------------------------
// Template loading + fill. fillTemplate never throws on a missing field: a
// blank simply stays empty. Injection targets the stamped [data-field] leaf
// elements (all text-only, so a tag-agnostic [^<]*? inner match is safe).
// ---------------------------------------------------------------------------
const templateCache: Record<string, string> = {};
async function loadTemplate(file: string): Promise<string> {
  if (templateCache[file]) return templateCache[file];
  const safe = path.basename(file); // never escape the templates dir
  const full = path.join(process.cwd(), 'public', 'doc-templates', safe);
  const html = await fs.readFile(full, 'utf8');
  templateCache[file] = html;
  return html;
}

export function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function injectField(html: string, field: string, value: string): string {
  const re = new RegExp(`(<(div|span)\\b[^>]*\\bdata-field="${field}"[^>]*>)[^<]*?(</\\2>)`);
  return html.replace(re, (_m, open, _tag, close) => open + escapeHtml(value) + close);
}

export interface FillOpts { serial: string; qrDataUrl?: string; method?: string; }

export async function fillTemplate(
  templateFile: string,
  values: Record<string, string>,
  opts: FillOpts
): Promise<string> {
  let html = await loadTemplate(templateFile);

  // 1) inject every stamped field
  for (const [field, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    html = injectField(html, field, String(value));
  }

  // 2) receipt method chip highlight (attribute-marked chips, no file edit)
  if (opts.method) {
    const re = new RegExp(`(<span\\b[^>]*)background:#fff;("[^>]*data-method-chip="${opts.method}"[^>]*>)`);
    html = html.replace(re, (_m, a, b) => a + 'background:#E6218C;color:#fff;' + b);
  }

  // 3) QR + serial badge, injected as an absolutely-positioned child of the
  // [data-doc-page] container (the money templates ship no striped QR
  // placeholder, so the engine appends one in known whitespace rather than
  // swapping). A future template that DOES carry a repeating-linear-gradient
  // placeholder is handled by the swap branch below.
  if (opts.qrDataUrl) {
    // generic swap path for templates that have a striped placeholder box
    html = html.replace(
      /<div([^>]*background:repeating-linear-gradient[^>]*)><\/div>/,
      `<img src="${opts.qrDataUrl}" alt="Verify" style="width:96px;height:96px;display:block;background:#fff;" />`
    );
    // money-doc badge path (invoice + receipt)
    const badge = qrBadgeHtml(templateFile, opts.serial, opts.qrDataUrl);
    if (badge) {
      html = html.replace(/(<div\b[^>]*\bdata-doc-page="[^"]*"[^>]*>)/, (_m, open) => open + badge);
    }
  }

  // 4) make asset refs portable (iframe srcdoc / hidden capture node both need
  // absolute, same-origin paths; the templates ship ../assets and ../uploads
  // which only resolve when served from /doc-templates/).
  html = html.replace(/\.\.\/assets\//g, '/assets/').replace(/\.\.\/uploads\//g, '/uploads/');
  return html;
}

function qrBadgeHtml(templateFile: string, serial: string, qr: string): string {
  if (templateFile.startsWith('26-invoice')) {
    return `<div style="position:absolute;left:44px;bottom:66px;display:flex;align-items:center;gap:11px;z-index:4;">`
      + `<img src="${qr}" alt="Verify" style="width:84px;height:84px;display:block;border:2px solid #111;border-radius:8px;background:#fff;" />`
      + `<div style="font-size:9px;font-weight:700;color:#111;line-height:1.55;">`
      + `<div style="font-family:'Bungee';font-size:8px;color:#E6218C;letter-spacing:.08em;">SCAN TO VERIFY</div>`
      + `<div style="font-weight:800;">${escapeHtml(serial)}</div>`
      + `<div style="color:#555;">urbangangtour.co.ke/verify</div></div></div>`;
  }
  if (templateFile.startsWith('27-receipt')) {
    return `<div style="position:absolute;left:18px;top:150px;width:64px;z-index:4;text-align:center;">`
      + `<img src="${qr}" alt="Verify" style="width:64px;height:64px;display:block;background:#fff;border:2px solid #fff;border-radius:6px;" />`
      + `<div style="font-family:'Bungee';font-size:6.5px;letter-spacing:.06em;color:#FFD400;margin-top:3px;">VERIFY</div></div>`;
  }
  return '';
}

export async function makeQrDataUrl(serial: string): Promise<string> {
  return QRCode.toDataURL(VERIFY_BASE + encodeURIComponent(serial), {
    margin: 1,
    width: 240,
    errorCorrectionLevel: 'M',
    color: { dark: '#111111', light: '#ffffff' },
  });
}

// ---------------------------------------------------------------------------
// Number formatting (KSH, whole shillings, thousands grouping - no Intl
// locale dependency).
// ---------------------------------------------------------------------------
export function fmtNum(n: number): string {
  const r = Math.round(Number(n) || 0);
  return r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ---------------------------------------------------------------------------
// Payload validation + normalisation. Shared by preview and generate so the
// numbers on screen are always the numbers stored. Rejects unexpected shapes,
// clamps lengths, recomputes every derived value server-side. Returns the
// clean payload (safe to persist), the display-computed values, and the
// issued_to / event / slug used for the record + filename.
// ---------------------------------------------------------------------------
function str(v: unknown, max = 300): string { return String(v ?? '').slice(0, max); }
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export interface PreparedDoc {
  type: DocType;
  payload: Record<string, unknown>;
  issued_to: string;
  event: string;
  slug: string;
  computed: Record<string, unknown>;
}

export function slugify(v: string): string {
  return (String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'doc';
}

// Certificate event date: an ISO yyyy-mm-dd (from a date input) becomes a
// human "11 July 2026"; any other free-text date (e.g. "Grand Finale, Dec
// 2026") passes through untouched. No locale dependency, no dashes in output.
const CERT_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
export function formatCertDate(v: string): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = m[1], mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${d} ${CERT_MONTHS[mo - 1]} ${y}`;
  }
  return s;
}

export function preparePayload(type: DocType, raw: any): PreparedDoc {
  const p = raw && typeof raw === 'object' ? raw : {};
  if (type === 'invoice') {
    const rawItems: any[] = Array.isArray(p.lineItems) ? p.lineItems.slice(0, 7) : [];
    const lineItems: LineItem[] = rawItems
      .map((it) => ({ description: str(it?.description, 120), qty: Math.max(0, Math.round(num(it?.qty))), rate: Math.max(0, Math.round(num(it?.rate))) }))
      .filter((it) => it.description || it.qty || it.rate);
    const totals = computeInvoiceTotals(lineItems, num(p.discount));
    const payload = {
      date: str(p.date, 40),
      dueDate: str(p.dueDate, 40),
      billTo: str(p.billTo, 160),
      poNumber: str(p.poNumber, 60),
      eventProject: str(p.eventProject, 160),
      lineItems,
      discount: totals.discount,
      subtotal: totals.subtotal,
      total: totals.total,
      mpesaTill: str(p.mpesaTill, 80),
      accountName: str(p.accountName, 80),
      bankDetails: str(p.bankDetails, 120),
    };
    return { type, payload, issued_to: payload.billTo, event: payload.eventProject, slug: slugify(payload.billTo || payload.eventProject), computed: { ...totals } };
  }
  if (type === 'certw') {
    // Winner certificate. recipientName is the identity of the award and is
    // required; the descriptive blanks (category / stop / date) may be left
    // empty, exactly as a hand-filled certificate can be. eventDate is
    // formatted to a readable form; a blank stays blank.
    const recipientName = str(p.recipientName, 120).trim();
    const category = str(p.category, 80).trim();
    const stopName = str(p.stopName, 80).trim();
    const eventDate = formatCertDate(str(p.eventDate, 60));
    if (!recipientName) throw new Error('recipientName_required');
    const payload = { recipientName, category, stopName, eventDate };
    const event = [category, stopName].filter(Boolean).join(' - ');
    return { type, payload, issued_to: recipientName, event, slug: slugify(recipientName), computed: { eventDate } };
  }
  if (type === 'certp') {
    // Participation certificate. participantName required; pod / stop optional.
    const participantName = str(p.participantName, 120).trim();
    const podName = str(p.podName, 80).trim();
    const stopName = str(p.stopName, 80).trim();
    if (!participantName) throw new Error('participantName_required');
    const payload = { participantName, podName, stopName };
    const event = [podName, stopName].filter(Boolean).join(' - ');
    return { type, payload, issued_to: participantName, event, slug: slugify(participantName), computed: {} };
  }
  // receipt
  const amount = Math.max(0, Math.round(num(p.amountFigures)));
  const methodRaw = str(p.method, 20);
  const method = ['M-PESA', 'Bank', 'Cash'].includes(methodRaw) ? methodRaw : 'M-PESA';
  const amountWords = numberToWords(amount);
  const payload = {
    date: str(p.date, 40),
    receivedFrom: str(p.receivedFrom, 160),
    amountFigures: amount,
    amountWords,
    beingPaymentFor: str(p.beingPaymentFor, 200),
    method,
    transactionRef: str(p.transactionRef, 80),
    balanceDue: p.balanceDue === '' || p.balanceDue === null || p.balanceDue === undefined ? '' : Math.max(0, Math.round(num(p.balanceDue))),
    invoiceNo: str(p.invoiceNo, 60),
    receivedBy: str(p.receivedBy, 120),
  };
  return { type, payload, issued_to: payload.receivedFrom, event: payload.beingPaymentFor, slug: slugify(payload.receivedFrom), computed: { amountWords, amountFigures: amount } };
}

// Map a prepared payload to the template's data-field values + method chip.
export function buildValues(type: DocType, payload: any, serial: string): { values: Record<string, string>; method?: string } {
  if (type === 'invoice') {
    const values: Record<string, string> = {
      invoiceNo: serial,
      date: payload.date || '',
      dueDate: payload.dueDate || '',
      billTo: payload.billTo || '',
      poNumber: payload.poNumber || '',
      eventProject: payload.eventProject || '',
      mpesaTill: payload.mpesaTill || '',
      accountName: payload.accountName || '',
      bankDetails: payload.bankDetails || '',
      subtotal: fmtNum(payload.subtotal || 0),
      discount: fmtNum(payload.discount || 0),
      total: fmtNum(payload.total || 0),
    };
    const items: LineItem[] = Array.isArray(payload.lineItems) ? payload.lineItems : [];
    items.slice(0, 7).forEach((it, i) => {
      const n = i + 1;
      values[`item${n}_description`] = it.description || '';
      values[`item${n}_qty`] = it.qty ? String(it.qty) : '';
      values[`item${n}_rate`] = it.rate ? fmtNum(it.rate) : '';
      values[`item${n}_amount`] = it.qty && it.rate ? fmtNum(it.qty * it.rate) : '';
    });
    return { values };
  }
  if (type === 'certw') {
    return {
      values: {
        recipientName: payload.recipientName || '',
        category: payload.category || '',
        stopName: payload.stopName || '',
        eventDate: payload.eventDate || '',
        certNo: serial,
      },
    };
  }
  if (type === 'certp') {
    return {
      values: {
        participantName: payload.participantName || '',
        podName: payload.podName || '',
        stopName: payload.stopName || '',
        certNo: serial,
      },
    };
  }
  // receipt
  const bal = payload.balanceDue === '' || payload.balanceDue === undefined || payload.balanceDue === null ? '' : fmtNum(payload.balanceDue);
  const values: Record<string, string> = {
    receiptNo: serial,
    serialTag: 'No ' + serial,
    date: payload.date || '',
    receivedFrom: payload.receivedFrom || '',
    amountFigures: 'KSH ' + fmtNum(payload.amountFigures || 0),
    amountWords: payload.amountWords || '',
    beingPaymentFor: payload.beingPaymentFor || '',
    transactionRef: payload.transactionRef || '',
    balanceDue: bal,
    invoiceNo: payload.invoiceNo || '',
    receivedBy: payload.receivedBy || '',
  };
  return { values, method: payload.method };
}

// Full render pipeline: prepared payload -> filled HTML. serial 'PREVIEW' for
// the live preview (no serial consumed).
export async function renderDoc(type: DocType, payload: any, serial: string): Promise<string> {
  const { values, method } = buildValues(type, payload, serial);
  const qrDataUrl = await makeQrDataUrl(serial);
  return fillTemplate(DOC_TYPES[type].template, values, { serial, qrDataUrl, method });
}

// ---------------------------------------------------------------------------
// DB helpers.
// ---------------------------------------------------------------------------
export interface DocRecord {
  id: string; type: string; serial: string; payload: any; issued_to: string; event: string;
  status: string; pdf_url: string; png_url: string; created_by: string; created_at: string;
  voided_at: string | null; void_reason: string;
}

function docId(): string {
  return 'doc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// Atomic: bump the serial and insert the immutable record in one transaction.
export async function insertDocument(args: {
  type: DocType; payload: Record<string, unknown>; issued_to: string; event: string;
  pdf_url: string; png_url: string; created_by: string;
}): Promise<{ id: string; serial: string }> {
  const pool = db();
  if (!pool) throw new Error('db_not_configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const serial = await bumpSerial(client, args.type);
    const id = docId();
    await client.query(
      `INSERT INTO ug_documents (id, type, serial, payload, issued_to, event, status, pdf_url, png_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'final',$7,$8,$9)`,
      [id, args.type, serial, JSON.stringify(args.payload), args.issued_to, args.event, args.pdf_url, args.png_url, args.created_by]
    );
    await client.query('COMMIT');
    return { id, serial };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function listDocuments(limit = 50): Promise<DocRecord[]> {
  return q<DocRecord>(
    `SELECT id, type, serial, payload, issued_to, event, status, pdf_url, png_url, created_by, created_at, voided_at, void_reason
     FROM ug_documents ORDER BY created_at DESC LIMIT $1`,
    [Math.min(200, Math.max(1, limit))]
  );
}

export async function getDocumentById(id: string): Promise<DocRecord | null> {
  const rows = await q<DocRecord>(
    `SELECT id, type, serial, payload, issued_to, event, status, pdf_url, png_url, created_by, created_at, voided_at, void_reason
     FROM ug_documents WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

// Idempotently attach the rendered blob URLs to a reserved record. Only sets
// them once (WHERE pdf_url=''), so a retried attach never overwrites; a record
// whose assets are already set is returned unchanged.
export async function setDocumentAssets(id: string, pdf_url: string, png_url: string): Promise<DocRecord | null> {
  const rows = await q<DocRecord>(
    `UPDATE ug_documents SET pdf_url=$2, png_url=$3
     WHERE id=$1 AND (pdf_url IS NULL OR pdf_url='')
     RETURNING id, type, serial, payload, issued_to, event, status, pdf_url, png_url, created_by, created_at, voided_at, void_reason`,
    [id, pdf_url, png_url]
  );
  if (rows[0]) return rows[0];
  return getDocumentById(id);
}

export async function getDocumentBySerial(serial: string): Promise<DocRecord | null> {
  const rows = await q<DocRecord>(
    `SELECT id, type, serial, payload, issued_to, event, status, pdf_url, png_url, created_by, created_at, voided_at, void_reason
     FROM ug_documents WHERE serial = $1`,
    [serial]
  );
  return rows[0] || null;
}

export async function voidDocument(serial: string, reason: string): Promise<DocRecord | null> {
  const rows = await q<DocRecord>(
    `UPDATE ug_documents SET status='void', voided_at=now(), void_reason=$2
     WHERE serial=$1 AND status <> 'void'
     RETURNING id, type, serial, payload, issued_to, event, status, pdf_url, png_url, created_by, created_at, voided_at, void_reason`,
    [serial, str(reason, 300)]
  );
  return rows[0] || null;
}

export async function docgenAudit(actor: string, action: string, detail: unknown): Promise<void> {
  try {
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,$2,$3)`, [actor || 'admin', action, JSON.stringify(detail ?? {})]);
  } catch {
    // audit failure must never block the mutation
  }
}
