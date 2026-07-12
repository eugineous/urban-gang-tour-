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
// A doc type maps either to ONE template (single-page: the 14 shipped types +
// the sponsorship agreement) or to an ordered list of page templates (a
// multi-page document rendered as several pages under ONE serial + record -
// the partnership + school proposals). `pages` takes precedence when present;
// `template` stays the single-page path and is untouched for every shipped type.
// A promo / social piece is PNG-output (posters also carry an A3 PDF). It maps
// to ONE template, declares its target PNG pixel size, and (unlike the 17
// documents) carries NO verify QR on the artwork - a poster with a verify QR is
// odd. It still gets a lightweight per-type serial + immutable record (audit
// trail + re-download). `kind` drives the client export path.
export interface PromoConfig { kind: 'post' | 'story' | 'poster'; png: [number, number]; pdf?: 'A3'; }
export interface DocTypeDef { code: string; label: string; template?: string; pages?: string[]; promo?: PromoConfig; }
export const DOC_TYPES: Record<string, DocTypeDef> = {
  invoice: { code: 'INV', label: 'Invoice', template: '26-invoice-a4.html' },
  receipt: { code: 'RCT', label: 'Receipt', template: '27-receipt-a5-slip.html' },
  certw: { code: 'CERTW', label: 'Winner Certificate', template: '07-certificate-winner.html' },
  certp: { code: 'CERTP', label: 'Participation Certificate', template: '08-certificate-participation.html' },
  call: { code: 'CALL', label: 'Call Sheet', template: '44-call-sheet-run-of-show-lari-boys.html' },
  budget: { code: 'BUD', label: 'Event Budget Sheet', template: '45-event-budget-sheet.html' },
  // Batch-by-quantity types (a run of N serialised items, each with its own QR).
  tix: { code: 'TIX', label: 'Event Ticket', template: '22-ticket-event-vip.html' },
  spass: { code: 'SPASS', label: 'Student Pass', template: '23-ticket-student-pass-front-back-game.html' },
  // band's template is resolved per bandType (see BAND_TEMPLATES / resolveTemplate).
  band: { code: 'BAND', label: 'Wristband', template: '10-wristband-ga-the-fan.html' },
  // Single-page letters and forms (phase: one template each, no batch/quantity).
  ltr: { code: 'LTR', label: 'Thank-You Letter', template: '49-thank-you-letter-schools.html' },
  acc: { code: 'ACC', label: 'Media Accreditation', template: '46-media-accreditation-form.html' },
  pass: { code: 'PASS', label: 'Gate / Vehicle Pass', template: '48-gate-vehicle-pass.html' },
  rel: { code: 'REL', label: 'Talent Media Release', template: '50-talent-media-release-form.html' },
  cons: { code: 'CONS', label: 'Parental Consent Letter', template: '52-parental-consent-letter.html' },
  // Multi-page documents: ONE serial + ONE record, rendered as several page
  // templates (cover + pitch + packages). The SAME serial + values fill every
  // page; the verify QR lands on page 1 (the cover) - see qrPageIndex().
  prop: { code: 'PROP', label: 'Partnership Proposal', pages: [
    '04-partnership-proposal-page1-cover.html',
    '05-partnership-proposal-page2-pitch.html',
    '06-partnership-proposal-page3-packages.html',
  ] },
  sprop: { code: 'SPROP', label: 'School Proposal', pages: [
    '41-school-proposal-page1-cover.html',
    '42-school-proposal-page2-format-day.html',
    '43-school-proposal-page3-investment.html',
  ] },
  // Single-page contract that carries a verify QR (a UGT-issued agreement).
  agr: { code: 'AGR', label: 'Sponsorship Agreement', template: '47-sponsorship-agreement.html' },

  // -------------------------------------------------------------------------
  // PROMO / SOCIAL (final phase). PNG-output pieces (IG posts 1080x1080, IG
  // story 1080x1920, posters a feed PNG + an A3 PDF). Each maps to one template
  // and declares its target export size. They get a per-type PROMO serial +
  // record (audit + re-download) but NO verify QR on the artwork. Text blanks
  // are stamped with data-field; hero photos fill data-hero-slot img slots from
  // uploads; picked partner logos fill a data-partner-strip on white chips.
  // Several templates reference brand images the owner still has to supply
  // (PPPtv Logo.png, tape-png-0.png, an-arrow-...webp, CAMPUS RAVE LOGO png.png)
  // - those render BLANK (the capture is missing-image tolerant) until dropped
  // into public/uploads. Nothing here fabricates a brand image.
  igNext:       { code: 'PROMO-NEXT',  label: 'IG Post - Next Stop',          template: '18-ig-post-next-stop.html',               promo: { kind: 'post',   png: [1080, 1080] } },
  igStory:      { code: 'PROMO-CAL',   label: 'IG Story - Term Calendar',     template: '19-ig-story-term-calendar.html',           promo: { kind: 'story',  png: [1080, 1920] } },
  igWinner:     { code: 'PROMO-WIN',   label: 'IG Post - Winner Spotlight',   template: '31-ig-post-winner-spotlight.html',         promo: { kind: 'post',   png: [1080, 1080] } },
  igEpisode:    { code: 'PROMO-EP',    label: 'IG Post - New Episode',        template: '32-ig-post-new-episode.html',              promo: { kind: 'post',   png: [1080, 1080] } },
  igMerch:      { code: 'PROMO-MERCH', label: 'IG Post - Merch Drop',         template: '33-ig-post-merch-drop.html',               promo: { kind: 'post',   png: [1080, 1080] } },
  igBookings:   { code: 'PROMO-BOOK',  label: 'IG Post - Bookings Open',      template: '34-ig-post-bookings-open.html',            promo: { kind: 'post',   png: [1080, 1080] } },
  igQuote:      { code: 'PROMO-QUOTE', label: 'IG Post - Quote Card',         template: '35-ig-post-quote-card.html',               promo: { kind: 'post',   png: [1080, 1080] } },
  posTakeover:  { code: 'PROMO-PSTKO', label: 'Poster - The Takeover',        template: '36-poster-the-takeover-multi-artist.html', promo: { kind: 'poster', png: [1080, 1512], pdf: 'A3' } },
  posHeadliner: { code: 'PROMO-PSHDL', label: 'Poster - Headliner',           template: '37-poster-headliner-kalamu-nyeusi.html',   promo: { kind: 'poster', png: [1080, 1512], pdf: 'A3' } },
  posFestival:  { code: 'PROMO-PSFST', label: 'Poster - Festival of Colours', template: '38-poster-festival-of-colours.html',       promo: { kind: 'poster', png: [1080, 1512], pdf: 'A3' } },
  posRave:      { code: 'PROMO-PSRAV', label: 'Poster - Campus Rave',         template: '39-poster-campus-rave.html',               promo: { kind: 'poster', png: [1080, 1512], pdf: 'A3' } },
  posFinale:    { code: 'PROMO-PSFIN', label: 'Poster - The Crowning Finale', template: '40-poster-the-crowning-finale.html',       promo: { kind: 'poster', png: [1080, 1512], pdf: 'A3' } },
};
export const ACTIVE_DOC_TYPES = ['invoice', 'receipt', 'certw', 'certp', 'call', 'budget', 'tix', 'spass', 'band', 'ltr', 'acc', 'pass', 'rel', 'cons', 'prop', 'sprop', 'agr',
  'igNext', 'igStory', 'igWinner', 'igEpisode', 'igMerch', 'igBookings', 'igQuote',
  'posTakeover', 'posHeadliner', 'posFestival', 'posRave', 'posFinale'] as const;
export type DocType = (typeof ACTIVE_DOC_TYPES)[number];

// Promo helpers + the managed partner-logo library (seeded from
// public/assets/partners/*). Partner logos always render on white chips.
export function isPromo(type: DocType): boolean { return !!DOC_TYPES[type]?.promo; }
export function promoConfig(type: DocType): PromoConfig | undefined { return DOC_TYPES[type]?.promo; }

export interface PromoPartner { key: string; label: string; url: string; }
export const PROMO_PARTNERS: PromoPartner[] = [
  { key: 'ppp-tv',         label: 'PPP TV',         url: '/assets/partners/ppp-tv.png' },
  { key: 'xp-hub',         label: 'XP Hub',         url: '/assets/partners/xp-hub.png' },
  { key: 'synapse',        label: 'Synapse Models', url: '/assets/partners/synapse.png' },
  { key: 'moyo',           label: 'Moyo',           url: '/assets/partners/moyo.png' },
  { key: 'ashton',         label: 'Ashton',         url: '/assets/partners/ashton.png' },
  { key: 'sauti-moto',     label: 'Sauti Moto',     url: '/assets/partners/sauti-moto.jpg' },
  { key: 'experience-hub', label: 'Experience Hub', url: '/assets/partners/experience-hub.png' },
  { key: 'vibe-studios',   label: 'Vibe Studios',   url: '/assets/partners/vibe-studios.webp' },
];

// The stamped text blanks per promo template (data-field names). Only these
// keys survive from the client payload (unknown fields are dropped), and each
// maps 1:1 to a [data-field] leaf element in the template. Fields inside nested
// markup (a headline split by <br>, a two-tone highlighted word) are NOT listed
// - they stay at their template default because injectField only replaces a
// tag-free text node.
export const PROMO_FIELDS: Record<string, string[]> = {
  igNext:       ['dateDay', 'dateMonth', 'schoolName', 'tagline1', 'tagline2', 'lineup'],
  igStory:      ['date1', 'school1', 'venue1', 'date2', 'school2', 'venue2', 'date3', 'school3', 'venue3'],
  igWinner:     ['winnerLine'],
  igEpisode:    ['episodeTag'],
  igMerch:      ['headline', 'subhead'],
  igBookings:   ['subhead'],
  igQuote:      ['volLabel', 'quote', 'attribution'],
  posTakeover:  ['dateDay', 'dateMonth', 'schoolName', 'tagline1', 'tagline2', 'lineup'],
  posHeadliner: ['preheadline', 'dateChip', 'venueChip', 'timeChip'],
  posFestival:  ['dateDay', 'dateMonth', 'titleTop', 'titleBottom', 'dateChip', 'venueChip', 'timeChip'],
  posRave:      ['edition', 'dateChip', 'venueChip', 'timeChip', 'lineup'],
  posFinale:    ['dateChip', 'venueChip', 'tvChip'],
};

// A hero-image / partner URL is only ever injected if it is one of ours: an
// uploaded Vercel Blob URL or a same-origin /assets or /uploads path. This
// blocks an arbitrary external URL from being baked into the artwork.
function isSafeAssetUrl(u: string): boolean {
  return /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(u)
    || /^\/(assets|uploads)\//.test(u);
}
export function resolvePartnerUrl(v: string): string {
  const known = PROMO_PARTNERS.find((pp) => pp.key === v);
  if (known) return known.url;
  if (/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(v)) return v;
  if (/^\/assets\/partners\//.test(v)) return v;
  return '';
}

// Wristband is one doc type (code BAND) but four artworks. The bandType picks
// the template; the serial counter, record and verify page stay type-agnostic.
export const BAND_TEMPLATES: Record<string, string> = {
  GA: '10-wristband-ga-the-fan.html',
  VIP: '11-wristband-vip-the-plug.html',
  Crew: '12-wristband-crew-the-engine.html',
  Student: '24-wristband-student-pass.html',
};

// Resolve the artwork file for a (type, payload). Only band is payload-dependent
// (its bandType selects one of BAND_TEMPLATES); every other single-page type is a
// fixed file. Multi-page types fall back to their first page here (callers that
// need every page use resolveTemplates()).
export function resolveTemplate(type: DocType, payload: any): string {
  if (type === 'band') {
    const bt = String(payload?.bandType || 'GA');
    return BAND_TEMPLATES[bt] || BAND_TEMPLATES.GA;
  }
  const def = DOC_TYPES[type];
  return def.template || def.pages?.[0] || '';
}

// A multi-page type declares an ordered `pages` array (>1 page). Single-page
// types (the 14 shipped ones + the agreement) have no `pages`.
export function isMultiPage(type: DocType): boolean {
  const pages = DOC_TYPES[type]?.pages;
  return Array.isArray(pages) && pages.length > 0;
}

// Every page template for a (type, payload), in render order. Single-page types
// return a one-element array so callers never special-case the count.
export function resolveTemplates(type: DocType, payload: any): string[] {
  const def = DOC_TYPES[type];
  if (def.pages && def.pages.length) return def.pages.slice();
  return [resolveTemplate(type, payload)];
}

// Which 0-based page carries the verify QR for a multi-page document. The
// proposals put it on the cover (page 1) - the branded face and the page the
// admin screenshots. Single-page types are index 0 by definition.
function qrPageIndex(_type: DocType): number { return 0; }

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
// Server-authoritative event-budget totals. Same guarantee as the invoice:
// client-sent totals are never trusted. Each money-in amount is recomputed from
// count*rate; totals, profit (in - out) and the savings transfer
// (profit * savingsPercent/100) are all derived here. Profit may be negative
// (a loss) and is returned as-is.
// ---------------------------------------------------------------------------
export interface BudgetMoneyIn { source: string; count: number; rate: number; amount: number; }
export interface BudgetMoneyOut { item: string; supplier: string; amount: number; }
export interface BudgetTotals {
  moneyIn: BudgetMoneyIn[];
  moneyOut: BudgetMoneyOut[];
  totalIn: number; totalOut: number; profit: number; savings: number; savingsPercent: number;
}

export function computeBudgetTotals(moneyIn: any[], moneyOut: any[], savingsPercent: number): BudgetTotals {
  const ins: BudgetMoneyIn[] = (Array.isArray(moneyIn) ? moneyIn : []).map((r) => {
    const count = Math.max(0, Math.round(Number(r?.count) || 0));
    const rate = Math.max(0, Math.round(Number(r?.rate) || 0));
    return { source: str(r?.source, 120), count, rate, amount: count * rate };
  });
  const outs: BudgetMoneyOut[] = (Array.isArray(moneyOut) ? moneyOut : []).map((r) => ({
    item: str(r?.item, 120),
    supplier: str(r?.supplier, 120),
    amount: Math.max(0, Math.round(Number(r?.amount) || 0)),
  }));
  const totalIn = ins.reduce((s, r) => s + r.amount, 0);
  const totalOut = outs.reduce((s, r) => s + r.amount, 0);
  const profit = totalIn - totalOut;
  let pct = Math.round(Number(savingsPercent) || 0);
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  const savings = Math.round((profit * pct) / 100);
  return { moneyIn: ins, moneyOut: outs, totalIn, totalOut, profit, savings, savingsPercent: pct };
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

export interface FillOpts {
  serial: string; qrDataUrl?: string; method?: string; tierScheme?: 'ga' | 'vip';
  // Selectable chips (media accreditation "covering as", gate-pass "zone").
  // chipsOn holds active "group:VALUE" tokens; chipDimGroup fades non-selected
  // pills of that group (single-select emphasis, e.g. the gate-pass zone).
  chipsOn?: string[]; chipDimGroup?: string;
  // Promo pieces: heroImages fill the template's data-hero-slot img slots
  // positionally (uploaded Blob URLs), partnerLogos fill a data-partner-strip
  // container with white chips. Both are already validated to be our own URLs.
  heroImages?: string[]; partnerLogos?: string[];
}

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

  // 1b) PROMO hero images -> swap the src of each data-hero-slot img (positional,
  // so uploaded image N fills slot N). object-fit:cover already lives on the slot
  // style, so the uploaded photo just crops to fit. A slot with no matching
  // upload keeps its template default photo. src can appear before or after the
  // data-hero-slot attribute, so we match the whole tag then rewrite its src.
  if (opts.heroImages && opts.heroImages.length) {
    opts.heroImages.forEach((url, i) => {
      if (!url) return;
      const safe = String(url).replace(/"/g, '&quot;');
      html = html.replace(new RegExp(`<img\\b[^>]*\\bdata-hero-slot="${i}"[^>]*>`), (tag) =>
        tag.replace(/\bsrc="[^"]*"/, `src="${safe}"`));
    });
  }

  // 1c) PROMO partner logos -> fill the marked strip (div or span) with white
  // chips (spec rule 5: partner logos always on white chips, min 24px). Only the
  // strip's inner content is replaced; if none are picked the template's own
  // default chips (where present) stay. The container holds only spans, so the
  // lazy inner match stops at the container's own closing tag.
  if (opts.partnerLogos && opts.partnerLogos.length) {
    const chips = opts.partnerLogos.map((u) => {
      const safe = String(u).replace(/"/g, '&quot;');
      return `<span style="background:#fff;border-radius:6px;padding:5px 9px;display:inline-flex;align-items:center;box-shadow:2px 2px 0 rgba(17,17,17,.28);">`
        + `<img src="${safe}" alt="" style="height:24px;width:auto;display:block;" /></span>`;
    }).join('');
    html = html.replace(
      /(<(div|span)\b[^>]*\bdata-partner-strip="1"[^>]*>)[\s\S]*?(<\/\2>)/,
      (_m, open, _tag, close) => open + chips + close
    );
  }

  // 2) receipt method chip highlight (attribute-marked chips, no file edit)
  if (opts.method) {
    const re = new RegExp(`(<span\\b[^>]*)background:#fff;("[^>]*data-method-chip="${opts.method}"[^>]*>)`);
    html = html.replace(re, (_m, a, b) => a + 'background:#E6218C;color:#fff;' + b);
  }

  // 2b) tick + highlight selectable chips (media accreditation "covering as",
  // gate-pass "zone"). data-chip="group:VALUE" marks the pill; data-chip-box the
  // inner checkbox square. Active tokens get a black ring + a filled tick; when
  // a dim group is set, the non-selected pills of that group fade back so the
  // matching one stands out (the gate-pass single-select zone). Applied as
  // inline-style rewrites for the same reason the tier recolour is: the
  // rasteriser captures only the [data-doc-page] node, so a <head> rule would
  // never reach the output.
  if (opts.chipsOn && opts.chipsOn.length) {
    const on = new Set(opts.chipsOn);
    const dim = opts.chipDimGroup ? opts.chipDimGroup + ':' : '';
    // NOTE: each style-append re-adds the CLOSING quote it consumed. The regex
    // `(style="[^"]*)"` captures the style value WITHOUT its closing quote and
    // matches that quote; the replacement must therefore end with a `"` or the
    // attribute is left unterminated. A lenient HTML parser tolerates that, but
    // html-to-image later re-serialises the node to XHTML for its foreignObject
    // snapshot, where an unterminated attribute swallows the next attribute into
    // a bogus name (e.g. `lane:title`) and produces invalid XML - which makes
    // the snapshot SVG fail to load. Keeping the quote keeps the markup valid.
    html = html.replace(/<span\b[^>]*\bdata-chip="([^"]*)"[^>]*>/g, (tag, token) => {
      if (on.has(token)) return tag.replace(/(style="[^"]*)"/, '$1;box-shadow:0 0 0 3px #111;position:relative;z-index:2;"');
      if (dim && String(token).startsWith(dim)) return tag.replace(/(style="[^"]*)"/, '$1;opacity:.28;"');
      return tag;
    });
    html = html.replace(/(<span\b[^>]*\bdata-chip-box="([^"]*)"[^>]*>)[\s\S]*?(<\/span>)/g, (m, open, token, close) => {
      if (!on.has(token)) return m;
      const filled = open.replace(/(style="[^"]*)"/, '$1;background:#111;display:flex;align-items:center;justify-content:center;"');
      return filled + `<span style="color:#fff;font-size:11px;line-height:1;font-weight:700;">&#10003;</span>` + close;
    });
  }

  // 3) QR + serial. Three mutually-exclusive paths so a template only ever gets
  // one QR: (a) a marked [data-qr-slot] (tickets/passes/wristbands) has its
  // inner markup swapped for the QR, keeping the box frame; (b) templates with
  // a code-defined corner badge (invoice, receipt, and the new letters/forms
  // ltr/acc/pass/rel) get an absolutely-positioned QR badge appended to the
  // [data-doc-page] node; (c) everything else falls back to swapping a striped
  // placeholder box (the certificates). Keeping these exclusive means the
  // gate-pass badge path leaves its decorative barcode strip intact and the
  // accreditation passport-photo box is never mistaken for a QR slot.
  if (opts.qrDataUrl) {
    const hasSlot = /data-qr-slot="1"/.test(html);
    const badge = qrBadgeHtml(templateFile, opts.serial, opts.qrDataUrl);
    if (hasSlot) {
      html = html.replace(
        /(<div\b[^>]*\bdata-qr-slot="1"[^>]*>)[\s\S]*?(<\/div>)/,
        (_m, open, close) => open + `<img src="${opts.qrDataUrl}" alt="Verify" style="width:100%;height:100%;object-fit:contain;display:block;background:#fff;" />` + close
      );
    } else if (badge) {
      html = html.replace(/(<div\b[^>]*\bdata-doc-page="[^"]*"[^>]*>)/, (_m, open) => open + badge);
    } else {
      // generic swap path for templates that have an empty striped placeholder
      html = html.replace(
        /<div([^>]*background:repeating-linear-gradient[^>]*)><\/div>/,
        `<img src="${opts.qrDataUrl}" alt="Verify" style="width:96px;height:96px;display:block;background:#fff;" />`
      );
    }
  }

  // 3b) Ticket tier recolour (spec: GA = magenta scheme, VIP = gold-on-black as
  // designed). The template ships VIP; for GA we swap the gold accents to
  // magenta ONLY on elements the template marks data-tier-gold / data-tier-goldbg
  // (so the brand tri-colour chips and 18+ chip keep their own colours). Applied
  // as inline-style rewrites because the rasteriser captures only the
  // [data-doc-page] node, so a <head> CSS rule would never reach the output.
  if (opts.tierScheme === 'ga') {
    html = html.replace(/<[^>]*\bdata-tier-gold="1"[^>]*>/g, (tag) =>
      tag.replace(/#FFD400/g, '#E6218C').replace(/#f0a500/g, '#ff3d9e').replace(/color:#111/g, 'color:#fff'));
    html = html.replace(/<[^>]*\bdata-tier-goldbg="1"[^>]*>/g, (tag) =>
      tag.replace(/rgba\(255,212,0,\.06\)/g, 'rgba(230,33,140,.12)'));
  }

  // 3c) Gate-pass card ships a slight decorative rotation (transform:rotate).
  // The client rasteriser captures the [data-doc-page] node itself, and a
  // self-rotated capture node clips its own corners, so neutralise the rotation
  // at render time only (the source template keeps it for standalone viewing).
  if (templateFile.startsWith('48-gate')) {
    html = html.replace('transform:rotate(-.6deg)', 'transform:none');
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
  // Thank-you letter: verify badge in the open lower-right whitespace, above the
  // footer bar (signature block sits lower-left, so the right is clear).
  if (templateFile.startsWith('49-thank-you')) {
    return `<div style="position:absolute;right:52px;bottom:116px;display:flex;align-items:center;gap:11px;z-index:5;">`
      + `<img src="${qr}" alt="Verify" style="width:76px;height:76px;display:block;border:2px solid #111;border-radius:8px;background:#fff;" />`
      + `<div style="font-size:9px;font-weight:700;color:#111;line-height:1.55;">`
      + `<div style="font-family:'Bungee';font-size:8px;color:#E6218C;letter-spacing:.08em;">SCAN TO VERIFY</div>`
      + `<div style="font-weight:800;">${escapeHtml(serial)}</div>`
      + `<div style="color:#555;">urbangangtour.co.ke/verify</div></div></div>`;
  }
  // Media accreditation: compact verify badge in the lower-left gap, above the
  // footer (office-use approval box + passport photo sit on the right).
  if (templateFile.startsWith('46-media')) {
    return `<div style="position:absolute;left:40px;bottom:70px;display:flex;align-items:center;gap:10px;z-index:5;">`
      + `<img src="${qr}" alt="Verify" style="width:66px;height:66px;display:block;border:2px solid #111;border-radius:8px;background:#fff;" />`
      + `<div style="font-size:8.5px;font-weight:700;color:#111;line-height:1.5;">`
      + `<div style="font-family:'Bungee';font-size:7.5px;color:#21C7E6;letter-spacing:.08em;">SCAN TO VERIFY</div>`
      + `<div style="font-weight:800;">${escapeHtml(serial)}</div>`
      + `<div style="color:#555;">urbangangtour.co.ke/verify</div></div></div>`;
  }
  // Gate / vehicle pass: QR sits in the card body's right gap, above the
  // decorative barcode strip. Small square so the gate crew can scan on the day.
  if (templateFile.startsWith('48-gate')) {
    return `<div style="position:absolute;right:26px;bottom:60px;display:flex;flex-direction:column;align-items:center;gap:3px;z-index:6;">`
      + `<img src="${qr}" alt="Verify" style="width:70px;height:70px;display:block;border:2px solid #fff;border-radius:8px;background:#fff;" />`
      + `<div style="font-family:'Bungee';font-size:6.5px;letter-spacing:.08em;color:#FFD400;">SCAN AT GATE</div></div>`;
  }
  // Talent media release: verify badge in the lower-right gap, above the footer.
  if (templateFile.startsWith('50-talent')) {
    return `<div style="position:absolute;right:40px;bottom:66px;display:flex;align-items:center;gap:10px;z-index:5;">`
      + `<img src="${qr}" alt="Verify" style="width:66px;height:66px;display:block;border:2px solid #111;border-radius:8px;background:#fff;" />`
      + `<div style="font-size:8.5px;font-weight:700;color:#111;line-height:1.5;">`
      + `<div style="font-family:'Bungee';font-size:7.5px;color:#E6218C;letter-spacing:.08em;">SCAN TO VERIFY</div>`
      + `<div style="font-weight:800;">${escapeHtml(serial)}</div>`
      + `<div style="color:#555;">urbangangtour.co.ke/verify</div></div></div>`;
  }
  // Proposal covers (partnership + school): a compact cream verify card pinned
  // to the clear top-right corner of the magenta cover (the vertical brand text
  // and centred logo sit elsewhere). This is the page the admin screenshots, so
  // the verify mark rides the deliverable itself.
  if (templateFile.startsWith('04-partnership') || templateFile.startsWith('41-school')) {
    return `<div style="position:absolute;right:32px;top:38px;display:flex;flex-direction:column;align-items:center;gap:5px;z-index:7;background:#FFFDF7;border:3px solid #111;border-radius:12px;box-shadow:4px 4px 0 #111;padding:9px 9px 8px;">`
      + `<img src="${qr}" alt="Verify" style="width:82px;height:82px;display:block;background:#fff;" />`
      + `<div style="font-family:'Bungee';font-size:6.5px;letter-spacing:.08em;color:#E6218C;">SCAN TO VERIFY</div>`
      + `<div style="font-size:8px;font-weight:800;color:#111;">${escapeHtml(serial)}</div></div>`;
  }
  // Sponsorship agreement: verify badge centred in the open band between the
  // key-terms block and the signature block (margin-top:auto leaves it clear).
  if (templateFile.startsWith('47-sponsorship')) {
    return `<div style="position:absolute;left:50%;transform:translateX(-50%);top:700px;display:flex;align-items:center;gap:12px;z-index:6;background:#FFFDF7;border:2.5px solid #111;border-radius:12px;box-shadow:4px 4px 0 #111;padding:10px 16px;">`
      + `<img src="${qr}" alt="Verify" style="width:74px;height:74px;display:block;border:2px solid #111;border-radius:8px;background:#fff;" />`
      + `<div style="font-size:9px;font-weight:700;color:#111;line-height:1.55;">`
      + `<div style="font-family:'Bungee';font-size:8px;color:#E6218C;letter-spacing:.08em;">SCAN TO VERIFY</div>`
      + `<div style="font-weight:800;">${escapeHtml(serial)}</div>`
      + `<div style="color:#555;">urbangangtour.co.ke/verify</div></div></div>`;
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
  if (isPromo(type)) {
    // Promo / social piece. No required field (a promo is not a verifiable
    // credential), so it never fails closed - any blank simply stays at the
    // template default. Only the whitelisted text blanks for this template
    // survive; heroImages (uploaded Blob URLs) and partnerLogos (library keys or
    // uploaded URLs) are resolved + validated to our own URLs so nothing foreign
    // can be baked into the artwork. eventName is recorded even when the chosen
    // template does not print it (it is the record's identity).
    const fields = PROMO_FIELDS[type] || [];
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      if (p[f] !== undefined && p[f] !== null) payload[f] = str(p[f], 400);
    }
    const eventName = str(p.eventName, 160).trim();
    if (eventName) payload.eventName = eventName;
    // Hero images fill slots POSITIONALLY (upload i -> data-hero-slot i), so an
    // unfilled or invalid slot stays '' (its template default) rather than being
    // dropped, which would shift every later upload into the wrong slot.
    const heroImages = (Array.isArray(p.heroImages) ? p.heroImages : [])
      .slice(0, 8)
      .map((u: unknown) => { const s = str(u, 600).trim(); return isSafeAssetUrl(s) ? s : ''; });
    payload.heroImages = heroImages;
    const partnerLogos = (Array.isArray(p.partnerLogos) ? p.partnerLogos : [])
      .map((v: unknown) => resolvePartnerUrl(str(v, 600).trim()))
      .filter((u: string) => !!u)
      .slice(0, 8);
    payload.partnerLogos = partnerLogos;
    const issued_to = eventName
      || str(payload.schoolName || payload.school1 || payload.headline || '', 160).trim()
      || DOC_TYPES[type].label;
    const event = str(payload.venueChip || payload.venue1 || payload.dateChip || '', 160).trim();
    return { type, payload, issued_to, event, slug: slugify(issued_to), computed: {} };
  }
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
  if (type === 'call') {
    // Call sheet + run of show. eventName is the identity used for the record /
    // verify page. crew, run-of-show and dont-forget are variable-length
    // repeaters mapped onto the template's positional slots by buildValues; any
    // fully-empty row is dropped here so blank rows never persist.
    const eventName = str(p.eventName, 160).trim();
    const venue = str(p.venue, 120);
    const date = str(p.date, 60);
    const crewCall = str(p.crewCall, 40);
    const dayRate = str(p.dayRate, 60);
    const director = str(p.director, 120);
    const stageManager = str(p.stageManager, 120);
    const crew = (Array.isArray(p.crew) ? p.crew.slice(0, 24) : [])
      .map((r: any) => ({ name: str(r?.name, 80), role: str(r?.role, 80) }))
      .filter((r: any) => r.name || r.role);
    const runOfShow = (Array.isArray(p.runOfShow) ? p.runOfShow.slice(0, 20) : [])
      .map((r: any) => ({ time: str(r?.time, 20), segment: str(r?.segment, 120), notes: str(r?.notes, 160) }))
      .filter((r: any) => r.time || r.segment || r.notes);
    const dontForget = (Array.isArray(p.dontForget) ? p.dontForget.slice(0, 8) : [])
      .map((v: any) => str(v, 160)).filter(Boolean);
    const payload = { eventName, venue, date, crewCall, dayRate, crew, runOfShow, director, stageManager, dontForget };
    return { type, payload, issued_to: eventName, event: venue, slug: slugify(eventName || 'call-sheet'), computed: {} };
  }
  if (type === 'budget') {
    // Event budget sheet. All money math is SERVER-owned (computeBudgetTotals):
    // each money-in amount = count*rate, totals + profit + savings are derived
    // here. Any client-sent totalIn/totalOut/profit/savings are ignored.
    const eventName = str(p.eventName, 160).trim();
    const date = str(p.date, 40);
    const preparedBy = str(p.preparedBy, 120);
    const rawIn = Array.isArray(p.moneyIn) ? p.moneyIn.slice(0, 5) : [];
    const rawOut = Array.isArray(p.moneyOut) ? p.moneyOut.slice(0, 11) : [];
    const t0 = computeBudgetTotals(rawIn, rawOut, num(p.savingsPercent));
    const moneyIn = t0.moneyIn.filter((r) => r.source || r.count || r.rate);
    const moneyOut = t0.moneyOut.filter((r) => r.item || r.supplier || r.amount);
    const totals = computeBudgetTotals(moneyIn, moneyOut, num(p.savingsPercent));

    // Soft crew-rule validation (non-blocking): if the caller carries a crew
    // headcount + rate and a money-out line reads as a crew payout, warn when
    // the payout amount does not equal headcount*rate. Surfaced to the admin
    // via computed.crewWarning; never persisted, never blocks generation.
    const crewCount = p.crewCount === '' || p.crewCount === null || p.crewCount === undefined ? null : Math.max(0, Math.round(num(p.crewCount)));
    const crewRate = p.crewRate === '' || p.crewRate === null || p.crewRate === undefined ? null : Math.max(0, Math.round(num(p.crewRate)));
    const crewLine = moneyOut.find((r) => /crew/i.test(r.item));
    let crewWarning = '';
    if (crewCount !== null && crewRate !== null && crewLine) {
      const expected = crewCount * crewRate;
      if (expected !== crewLine.amount) {
        crewWarning = `Crew payout line is KSH ${fmtNum(crewLine.amount)} but headcount x rate = ${crewCount} x ${fmtNum(crewRate)} = KSH ${fmtNum(expected)}. Confirm the flat-rate crew rule.`;
      }
    }

    const payload = {
      eventName, date, preparedBy,
      moneyIn, moneyOut,
      savingsPercent: totals.savingsPercent,
      totalIn: totals.totalIn, totalOut: totals.totalOut, profit: totals.profit, savings: totals.savings,
      crewCount: crewCount === null ? '' : crewCount,
      crewRate: crewRate === null ? '' : crewRate,
    };
    const computed = {
      totalIn: totals.totalIn, totalOut: totals.totalOut, profit: totals.profit,
      savings: totals.savings, savingsPercent: totals.savingsPercent, crewWarning,
    };
    return { type, payload, issued_to: eventName, event: '', slug: slugify(eventName || 'budget'), computed };
  }
  if (type === 'tix') {
    // Event ticket. eventName is the identity; venue/date/gateTime are the
    // printed chips. tier is GA or VIP.
    //
    // HARD RULE (spec): a SCHOOL stop is single-tier only. A VIP ticket must
    // NEVER be generatable for a school stop. We fail CLOSED: any request with
    // schoolStop=true AND tier=VIP is rejected here (this runs on preview,
    // single generate AND every batch row, so it cannot be bypassed), and a
    // school stop is otherwise forced to GA.
    const eventName = str(p.eventName, 120).trim();
    const venue = str(p.venue, 80).trim();
    const date = str(p.date, 60).trim();
    const gateTime = str(p.gateTime, 40).trim();
    const schoolStop = p.schoolStop === true || p.schoolStop === 'true' || p.schoolStop === 1 || p.schoolStop === '1';
    let tier = str(p.tier, 10).toUpperCase();
    if (tier !== 'VIP' && tier !== 'GA') tier = 'GA';
    if (!eventName) throw new Error('eventName_required');
    if (schoolStop && tier === 'VIP') throw new Error('school_stop_is_single_tier_no_vip');
    if (schoolStop) tier = 'GA';
    const payload = { eventName, venue, date, gateTime, tier, schoolStop };
    const event = [venue, date].filter(Boolean).join(' - ');
    return { type, payload, issued_to: eventName, event, slug: slugify(eventName), computed: { tier, schoolStop } };
  }
  if (type === 'spass') {
    // Student pass (inherently a school / single-tier pass). eventName required;
    // schoolName + date are the printed blanks.
    const eventName = str(p.eventName, 120).trim();
    const schoolName = str(p.schoolName, 120).trim();
    const date = str(p.date, 60).trim();
    if (!eventName) throw new Error('eventName_required');
    const payload = { eventName, schoolName, date };
    const event = eventName;
    return { type, payload, issued_to: schoolName || eventName, event, slug: slugify(schoolName || eventName), computed: {} };
  }
  if (type === 'band') {
    // Wristband. bandType picks the artwork (GA/VIP/Crew = event bands, tier
    // only; Student = school band with schoolName + date). eventName is optional
    // and only used for the record / manifest.
    const bandType = ['GA', 'VIP', 'Crew', 'Student'].includes(str(p.bandType, 10)) ? str(p.bandType, 10) : 'GA';
    const eventName = str(p.eventName, 120).trim();
    const schoolName = str(p.schoolName, 120).trim();
    const date = str(p.date, 60).trim();
    const payload = { bandType, eventName, schoolName, date };
    const issued_to = bandType === 'Student' ? (schoolName || eventName || 'Student band') : (eventName || `${bandType} band`);
    const event = bandType === 'Student' ? [schoolName, date].filter(Boolean).join(' - ') : eventName;
    return { type, payload, issued_to, event, slug: slugify(eventName || schoolName || `${bandType}-band`), computed: { bandType } };
  }
  if (type === 'ltr') {
    // Thank-you letter to a host school. schoolName is the identity (addressee)
    // and is required; the rest are simple text fills. date is formatted to a
    // readable form when an ISO date is given; free text passes through.
    const schoolName = str(p.schoolName, 160).trim();
    const principalSalutation = str(p.principalSalutation, 120).trim();
    const winnerNames = str(p.winnerNames, 200).trim();
    const winnerCategory = str(p.winnerCategory, 120).trim();
    const date = formatCertDate(str(p.date, 60));
    if (!schoolName) throw new Error('schoolName_required');
    const payload = { schoolName, principalSalutation, winnerNames, winnerCategory, date };
    return { type, payload, issued_to: schoolName, event: winnerCategory, slug: slugify(schoolName), computed: {} };
  }
  if (type === 'acc') {
    // Media accreditation. fullName is the identity (required). coveringAs is a
    // multi-select rendered as ticked chips; only the known tokens survive.
    // badgeNo is the auto serial (set in buildValues), approvedBy is office use.
    const fullName = str(p.fullName, 120).trim();
    const idNumber = str(p.idNumber, 40).trim();
    const outlet = str(p.outlet, 120).trim();
    const handle = str(p.handle, 80).trim();
    const phone = str(p.phone, 40).trim();
    const email = str(p.email, 120).trim();
    const event = str(p.event, 120).trim();
    const date = formatCertDate(str(p.date, 60));
    const equipment = str(p.equipment, 200).trim();
    const approvedBy = str(p.approvedBy, 120).trim();
    const COVER = ['PHOTO', 'VIDEO', 'PRINT', 'RADIO', 'CREATOR'];
    const coveringAs = Array.from(new Set(
      (Array.isArray(p.coveringAs) ? p.coveringAs : []).map((x: unknown) => str(x, 20).toUpperCase()).filter((x: string) => COVER.includes(x))
    ));
    if (!fullName) throw new Error('fullName_required');
    const payload = { fullName, idNumber, outlet, handle, phone, email, event, date, coveringAs, equipment, approvedBy };
    return { type, payload, issued_to: fullName, event, slug: slugify(fullName), computed: {} };
  }
  if (type === 'pass') {
    // Gate / vehicle pass. vehicleReg is the identity (required). zone is a
    // single-select enum that ticks + highlights the matching chip; an unknown
    // value falls back to Stage. Carries a QR (verify).
    const vehicleReg = str(p.vehicleReg, 40).trim();
    const driver = str(p.driver, 120).trim();
    const event = str(p.event, 120).trim();
    const date = formatCertDate(str(p.date, 60));
    const ZONES = ['Stage', 'Media', 'VIP', 'Vendor'];
    const zoneRaw = str(p.zone, 20).trim();
    const zone = ZONES.find((z) => z.toLowerCase() === zoneRaw.toLowerCase()) || 'Stage';
    if (!vehicleReg) throw new Error('vehicleReg_required');
    const payload = { vehicleReg, driver, event, date, zone };
    return { type, payload, issued_to: vehicleReg, event, slug: slugify(vehicleReg || 'gate-pass'), computed: { zone } };
  }
  if (type === 'rel') {
    // Talent media release. talentName + age are required (age is needed to
    // enforce the minor rule). HARD RULE (spec): a release for an under-18
    // talent MUST carry a guardian block (name + relationship + phone); we fail
    // CLOSED here, so an under-18 release with no guardian is rejected on
    // preview, single generate and any batch row. linkedCertSerial is optional;
    // its existence is checked softly in preparePayloadFull (warn, still allow).
    const talentName = str(p.talentName, 120).trim();
    const ageRaw = p.age;
    const age = ageRaw === '' || ageRaw === null || ageRaw === undefined ? null : Math.max(0, Math.round(num(ageRaw)));
    const school = str(p.school, 120).trim();
    const category = str(p.category, 80).trim();
    const event = str(p.event, 120).trim();
    const date = formatCertDate(str(p.date, 60));
    const guardianName = str(p.guardianName, 120).trim();
    const relationship = str(p.relationship, 80).trim();
    const guardianPhone = str(p.phone, 40).trim();
    const linkedCertSerial = str(p.linkedCertSerial, 40).trim().toUpperCase();
    if (!talentName) throw new Error('talentName_required');
    if (age === null) throw new Error('age_required');
    if (age < 18 && (!guardianName || !relationship || !guardianPhone)) {
      throw new Error('guardian_block_required_for_minor');
    }
    const payload: Record<string, unknown> = {
      talentName, age, school, category, event, date,
      guardianName, relationship, phone: guardianPhone, linkedCertSerial,
    };
    return { type, payload, issued_to: talentName, event, slug: slugify(talentName), computed: {} };
  }
  if (type === 'cons') {
    // Parental consent letter. Signed BY THE SCHOOL - the generator only
    // pre-fills the school-specific blanks; the stamp/signatures stay physical
    // and there is NO QR-verify (it is a school-issued reply slip, not a
    // UGT-issued verifiable credential). It still gets a CONS serial for the
    // record. schoolName is the identity (required).
    const schoolName = str(p.schoolName, 160).trim();
    const schoolAddress = str(p.schoolAddress, 160).trim();
    const eventDate = formatCertDate(str(p.eventDate, 60));
    const returnByDate = formatCertDate(str(p.returnByDate, 60));
    if (!schoolName) throw new Error('schoolName_required');
    const payload = { schoolName, schoolAddress, eventDate, returnByDate };
    return { type, payload, issued_to: schoolName, event: '', slug: slugify(schoolName || 'consent'), computed: {} };
  }
  if (type === 'prop') {
    // Partnership proposal (3 pages, ONE PROP serial). Only the cover carries
    // blanks; pages 2/3 are fixed pitch/package content. preparedFor is the
    // identity (the partner) and is required; preparedBy/date are simple fills.
    const preparedFor = str(p.preparedFor, 160).trim();
    const preparedBy = str(p.preparedBy, 160).trim();
    const date = formatCertDate(str(p.date, 60));
    if (!preparedFor) throw new Error('preparedFor_required');
    const payload = { preparedFor, preparedBy, date };
    return { type, payload, issued_to: preparedFor, event: '', slug: slugify(preparedFor), computed: {} };
  }
  if (type === 'sprop') {
    // School proposal (3 pages, ONE SPROP serial). schoolName is the identity
    // (required); attention + date fill the cover. HARD RULE (spec): page 3
    // stays negotiation-framed - there is NO price field of any kind, so no
    // figure can ever be keyed in or printed. eventDate is optional and only
    // recorded (there is no date-of-event blank on the fixed pages).
    const schoolName = str(p.schoolName, 160).trim();
    const attention = str(p.attention, 120).trim();
    const date = formatCertDate(str(p.date, 60));
    const eventDate = formatCertDate(str(p.eventDate, 60));
    if (!schoolName) throw new Error('schoolName_required');
    const payload = { schoolName, attention, date, eventDate };
    return { type, payload, issued_to: schoolName, event: eventDate, slug: slugify(schoolName), computed: {} };
  }
  if (type === 'agr') {
    // Sponsorship agreement (single page, AGR serial, verify QR). sponsorName is
    // the identity (required). lane is a single-select enum (ticks + highlights
    // the matching chip, dims the others). rightsGranted is a multi-select that
    // mirrors the template's own six checkboxes. feeKsh / inKindValue are AGREED
    // figures (not derived) - validated + formatted as KSH, never trusted as
    // words; an empty figure stays blank (not "KSH 0").
    const sponsorName = str(p.sponsorName, 160).trim();
    const sponsorAddress = str(p.sponsorAddress, 200).trim();
    const contactPerson = str(p.contactPerson, 160).trim();
    const coverage = str(p.coverage, 200).trim();
    const LANES = ['Title', 'Headline', 'Official', 'Community'];
    const laneRaw = str(p.lane, 20).trim();
    const lane = LANES.find((l) => l.toLowerCase() === laneRaw.toLowerCase()) || 'Title';
    const RIGHTS = ['LOGO', 'HOSTREAD', 'ACTIVATION', 'FEATURE', 'SOCIAL', 'EXCLUSIVITY'];
    const rightsGranted = Array.from(new Set(
      (Array.isArray(p.rightsGranted) ? p.rightsGranted : []).map((x: unknown) => str(x, 20).toUpperCase()).filter((x: string) => RIGHTS.includes(x))
    ));
    const exclusivityCategory = str(p.exclusivityCategory, 120).trim();
    const feeKsh = p.feeKsh === '' || p.feeKsh === null || p.feeKsh === undefined ? '' : Math.max(0, Math.round(num(p.feeKsh)));
    const inKindValue = p.inKindValue === '' || p.inKindValue === null || p.inKindValue === undefined ? '' : Math.max(0, Math.round(num(p.inKindValue)));
    const paymentTerms = str(p.paymentTerms, 120).trim();
    const balanceDueDate = formatCertDate(str(p.balanceDueDate, 60));
    if (!sponsorName) throw new Error('sponsorName_required');
    const payload = {
      sponsorName, sponsorAddress, contactPerson, coverage, lane, rightsGranted,
      exclusivityCategory, feeKsh, inKindValue, paymentTerms, balanceDueDate,
    };
    const event = coverage || `${lane} Partner`;
    return { type, payload, issued_to: sponsorName, event, slug: slugify(sponsorName), computed: {} };
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

// Soft cross-reference: does this serial belong to an existing, non-void
// winner/participation certificate? Used only by the talent release to warn
// (never block) when its linkedCertSerial is not on file.
export async function resolveLinkedCert(serial: string): Promise<{ exists: boolean; type: string | null }> {
  const s = String(serial || '').trim().toUpperCase();
  if (!s) return { exists: false, type: null };
  try {
    const rec = await getDocumentBySerial(s);
    if (rec && (rec.type === 'certw' || rec.type === 'certp') && rec.status !== 'void') return { exists: true, type: rec.type };
    return { exists: false, type: rec ? rec.type : null };
  } catch {
    return { exists: false, type: null };
  }
}

// Async wrapper over preparePayload for the routes: identical output, plus the
// talent release's soft linked-certificate check (existence is DB-bound, so it
// cannot live in the sync validator). The link is ALWAYS stored; a missing or
// wrong-type serial only adds computed.linkWarning and payload.linkedCertValid
// so the admin sees it, per spec ("warn but still allow").
export async function preparePayloadFull(type: DocType, raw: any): Promise<PreparedDoc> {
  const prepared = preparePayload(type, raw);
  if (type === 'rel') {
    const serial = String((prepared.payload as any).linkedCertSerial || '');
    if (serial) {
      const lc = await resolveLinkedCert(serial);
      (prepared.payload as any).linkedCertValid = lc.exists;
      if (!lc.exists) {
        (prepared.computed as any).linkWarning =
          `Linked certificate ${serial} was not found on file (or is not a winner/participation certificate). The release was still issued and the link stored - confirm the certificate number.`;
      }
    }
  }
  return prepared;
}

// Map a prepared payload to the template's data-field values + method chip /
// chip highlights.
export function buildValues(type: DocType, payload: any, serial: string): { values: Record<string, string>; method?: string; chipsOn?: string[]; chipDimGroup?: string; heroImages?: string[]; partnerLogos?: string[] } {
  if (isPromo(type)) {
    // Promo pieces: the whitelisted text blanks map 1:1 to data-field names; the
    // hero photos and partner logos are carried to fillTemplate as opts (not
    // data-field text). No serial is stamped on the artwork (promo has no QR).
    const values: Record<string, string> = {};
    for (const f of PROMO_FIELDS[type] || []) {
      if (typeof payload[f] === 'string') values[f] = payload[f];
    }
    return {
      values,
      heroImages: Array.isArray(payload.heroImages) ? payload.heroImages : [],
      partnerLogos: Array.isArray(payload.partnerLogos) ? payload.partnerLogos : [],
    };
  }
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
  if (type === 'call') {
    const values: Record<string, string> = {
      callNo: serial,
      eventName: payload.eventName || '',
      venue: payload.venue || '',
      date: payload.date || '',
      crewCall: payload.crewCall || '',
      dayRate: payload.dayRate || '',
      director: payload.director || '',
      stageManager: payload.stageManager || '',
    };
    const crew: any[] = Array.isArray(payload.crew) ? payload.crew : [];
    for (let i = 0; i < 24; i++) {
      const r = crew[i];
      const n = i + 1;
      values[`crew${n}_name`] = r?.name || '';
      values[`crew${n}_role`] = r?.role || '';
    }
    const ros: any[] = Array.isArray(payload.runOfShow) ? payload.runOfShow : [];
    for (let i = 0; i < 20; i++) {
      const r = ros[i];
      const n = i + 1;
      values[`ros${n}_time`] = r?.time || '';
      values[`ros${n}_segment`] = r?.segment || '';
      values[`ros${n}_notes`] = r?.notes || '';
    }
    const df: any[] = Array.isArray(payload.dontForget) ? payload.dontForget : [];
    for (let i = 0; i < 8; i++) values[`dontforget${i + 1}`] = df[i] || '';
    return { values };
  }
  if (type === 'budget') {
    const values: Record<string, string> = {
      budgetNo: serial,
      eventName: payload.eventName || '',
      date: payload.date || '',
      preparedBy: payload.preparedBy || '',
      totalIn: fmtNum(payload.totalIn || 0),
      totalOut: fmtNum(payload.totalOut || 0),
      profit: fmtNum(payload.profit || 0),
      savings: fmtNum(payload.savings || 0),
      savingsPercent: String(payload.savingsPercent ?? 0),
    };
    const ins: any[] = Array.isArray(payload.moneyIn) ? payload.moneyIn : [];
    for (let i = 0; i < 5; i++) {
      const r = ins[i];
      const n = i + 1;
      values[`in${n}_source`] = r?.source || '';
      values[`in${n}_count`] = r && r.count ? String(r.count) : '';
      values[`in${n}_rate`] = r && r.rate ? fmtNum(r.rate) : '';
      values[`in${n}_amount`] = r && r.amount ? fmtNum(r.amount) : '';
    }
    const outs: any[] = Array.isArray(payload.moneyOut) ? payload.moneyOut : [];
    for (let i = 0; i < 11; i++) {
      const r = outs[i];
      const n = i + 1;
      values[`out${n}_item`] = r?.item || '';
      values[`out${n}_supplier`] = r?.supplier || '';
      values[`out${n}_amount`] = r && r.amount ? fmtNum(r.amount) : '';
    }
    return { values };
  }
  if (type === 'tix') {
    return {
      values: {
        eventName: payload.eventName || '',
        venue: payload.venue || '',
        date: payload.date || '',
        gateTime: payload.gateTime || '',
        tier: payload.tier === 'VIP' ? 'VIP' : 'GA',
        serialTag: serial,
      },
    };
  }
  if (type === 'spass') {
    return {
      values: {
        eventName: payload.eventName || '',
        schoolName: payload.schoolName || '',
        date: payload.date || '',
        serialTag: serial,
      },
    };
  }
  if (type === 'band') {
    // Event bands ignore schoolName/date (no such field in their artwork);
    // the Student band consumes them. serialTag + QR apply to every band.
    return {
      values: {
        schoolName: payload.schoolName || '',
        date: payload.date || '',
        serialTag: serial,
      },
    };
  }
  if (type === 'ltr') {
    return {
      values: {
        schoolName: payload.schoolName || '',
        principalSalutation: payload.principalSalutation || '',
        winnerNames: payload.winnerNames || '',
        winnerCategory: payload.winnerCategory || '',
        date: payload.date || '',
      },
    };
  }
  if (type === 'acc') {
    const cover: string[] = Array.isArray(payload.coveringAs) ? payload.coveringAs : [];
    return {
      values: {
        fullName: payload.fullName || '',
        idNumber: payload.idNumber || '',
        outlet: payload.outlet || '',
        handle: payload.handle || '',
        phone: payload.phone || '',
        email: payload.email || '',
        event: payload.event || '',
        date: payload.date || '',
        equipment: payload.equipment || '',
        approvedBy: payload.approvedBy || '',
        badgeNo: serial,
      },
      chipsOn: cover.map((c) => 'cover:' + c),
    };
  }
  if (type === 'pass') {
    return {
      values: {
        passNo: serial,
        vehicleReg: payload.vehicleReg || '',
        driver: payload.driver || '',
        event: payload.event || '',
        date: payload.date || '',
      },
      chipsOn: ['zone:' + (payload.zone || 'Stage')],
      chipDimGroup: 'zone',
    };
  }
  if (type === 'rel') {
    return {
      values: {
        talentName: payload.talentName || '',
        age: payload.age === null || payload.age === undefined ? '' : String(payload.age),
        school: payload.school || '',
        category: payload.category || '',
        event: payload.event || '',
        date: payload.date || '',
        guardianName: payload.guardianName || '',
        relationship: payload.relationship || '',
        guardianPhone: payload.phone || '',
        linkedCertSerial: payload.linkedCertSerial || '',
      },
    };
  }
  if (type === 'cons') {
    return {
      values: {
        schoolName: payload.schoolName || '',
        schoolAddress: payload.schoolAddress || '',
        eventDate: payload.eventDate || '',
        returnByDate: payload.returnByDate || '',
      },
    };
  }
  if (type === 'prop') {
    // The same values fill all three pages; only the cover has these blanks.
    return {
      values: {
        preparedFor: payload.preparedFor || '',
        preparedBy: payload.preparedBy || '',
        date: payload.date || '',
      },
    };
  }
  if (type === 'sprop') {
    // eventDate is recorded only (no slot on the fixed pages), so it is not a
    // stamped value here - page 3 investment stays untouched (no price ever).
    return {
      values: {
        schoolName: payload.schoolName || '',
        attention: payload.attention || '',
        date: payload.date || '',
      },
    };
  }
  if (type === 'agr') {
    const rights: string[] = Array.isArray(payload.rightsGranted) ? payload.rightsGranted : [];
    const feeKsh = payload.feeKsh === '' || payload.feeKsh === null || payload.feeKsh === undefined ? '' : 'KSH ' + fmtNum(payload.feeKsh);
    const inKindValue = payload.inKindValue === '' || payload.inKindValue === null || payload.inKindValue === undefined ? '' : 'KSH ' + fmtNum(payload.inKindValue);
    return {
      values: {
        sponsorName: payload.sponsorName || '',
        sponsorAddress: payload.sponsorAddress || '',
        contactPerson: payload.contactPerson || '',
        coverage: payload.coverage || '',
        exclusivityCategory: payload.exclusivityCategory || '',
        feeKsh,
        inKindValue,
        paymentTerms: payload.paymentTerms || '',
        balanceDueDate: payload.balanceDueDate || '',
      },
      // lane -> single-select chip (dim the other lanes); rights -> multi-select
      // ticks. Same mechanism the accreditation / gate-pass chips use.
      chipsOn: ['lane:' + (payload.lane || 'Title'), ...rights.map((r) => 'right:' + r)],
      chipDimGroup: 'lane',
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
//
// Return shape: a single-page type returns ONE filled HTML string (the shipped
// contract, unchanged); a multi-page type returns an ARRAY of filled page HTMLs
// (one per page, same serial + values). Every caller checks Array.isArray.
//
// The QR is issued once: only the page at qrPageIndex() (the cover) gets a
// qrDataUrl, so a multi-page doc carries exactly one verify code. Parental
// consent is signed BY THE SCHOOL, not UGT-issued, so it carries no QR at all.
export async function renderDoc(type: DocType, payload: any, serial: string): Promise<string | string[]> {
  const { values, method, chipsOn, chipDimGroup, heroImages, partnerLogos } = buildValues(type, payload, serial);
  const templates = resolveTemplates(type, payload);
  const tierScheme = type === 'tix' ? (payload?.tier === 'VIP' ? 'vip' : 'ga') : undefined;
  // Parental consent is school-signed (no QR); promo pieces carry no verify QR
  // on the artwork (a poster with a verify QR is odd).
  const noQr = type === 'cons' || isPromo(type);
  const qrIdx = qrPageIndex(type);
  const pages: string[] = [];
  for (let i = 0; i < templates.length; i++) {
    const qrDataUrl = !noQr && i === qrIdx ? await makeQrDataUrl(serial) : undefined;
    pages.push(await fillTemplate(templates[i], values, { serial, qrDataUrl, method, tierScheme, chipsOn, chipDimGroup, heroImages, partnerLogos }));
  }
  return isMultiPage(type) ? pages : pages[0];
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
  // Idempotent attach: only sets the assets once. Promo pieces are PNG-only
  // (pdf_url stays empty for IG posts), so the guard checks png_url too - once
  // the png is attached a retry is a no-op, whether or not a pdf was produced.
  const rows = await q<DocRecord>(
    `UPDATE ug_documents SET pdf_url=$2, png_url=$3
     WHERE id=$1 AND (pdf_url IS NULL OR pdf_url='') AND (png_url IS NULL OR png_url='')
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
