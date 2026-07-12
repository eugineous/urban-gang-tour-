'use client';

// Document Generator UI (Invoice + Receipt + Winner/Participation certs).
//
// Flow: pick type -> fill the schema form -> a debounced /preview call returns
// the server-filled brand-template HTML (with server-computed totals /
// amount-in-words) which renders live in a sandboxed iframe -> Generate
// reserves the real serial (phase 1), the client rasterises the returned HTML
// to PNG (html-to-image) + PDF (jspdf) at the template's exact size, then
// attaches them to the record (phase 2). Recent documents list supports void.
//
// Certificates add a CSV BATCH mode: upload a .csv (one row per certificate),
// preview the parsed rows, then Generate All -> the server reserves one serial
// per row in a single all-or-nothing call (/batch), the client rasterises +
// attaches each, and offers one ZIP of every PDF. Serials stay gapless: a bad
// row rejects the whole batch and reserves nothing.
//
// Adding a future doc type: add it to DOC_TYPES + a <Form> branch here; the
// preview/generate/list/void plumbing is type-agnostic.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, th, td, Chip, api } from '../ops/ui';

const VERIFY_BASE = 'https://urbangangtour.co.ke/verify/';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Anton&family=Bungee&family=Permanent+Marker&family=Space+Grotesk:wght@400;500;600;700&display=swap';

type DocType = 'invoice' | 'receipt' | 'certw' | 'certp' | 'call' | 'budget' | 'tix' | 'spass' | 'band' | 'ltr' | 'acc' | 'pass' | 'rel' | 'cons' | 'prop' | 'sprop' | 'agr'
  | 'igNext' | 'igStory' | 'igWinner' | 'igEpisode' | 'igMerch' | 'igBookings' | 'igQuote'
  | 'posTakeover' | 'posHeadliner' | 'posFestival' | 'posRave' | 'posFinale';
const TYPES: { key: DocType; label: string }[] = [
  { key: 'invoice', label: 'Invoice' },
  { key: 'receipt', label: 'Receipt' },
  { key: 'certw', label: 'Winner Certificate' },
  { key: 'certp', label: 'Participation Certificate' },
  { key: 'call', label: 'Call Sheet' },
  { key: 'budget', label: 'Event Budget Sheet' },
  { key: 'tix', label: 'Event Ticket' },
  { key: 'spass', label: 'Student Pass' },
  { key: 'band', label: 'Wristband' },
  { key: 'ltr', label: 'Thank-You Letter' },
  { key: 'acc', label: 'Media Accreditation' },
  { key: 'pass', label: 'Gate / Vehicle Pass' },
  { key: 'rel', label: 'Talent Release' },
  { key: 'cons', label: 'Parental Consent' },
  { key: 'prop', label: 'Partnership Proposal' },
  { key: 'sprop', label: 'School Proposal' },
  { key: 'agr', label: 'Sponsorship Agreement' },
];

// ---------------------------------------------------------------------------
// PROMO / SOCIAL pieces (PNG output; posters also an A3 PDF). Each declares its
// card design px (drives preview + capture), its target PNG size, its stamped
// text blanks (data-field keys), its hero-photo slots (data-hero-slot, filled by
// upload), whether it carries a managed partner-logo strip, and the brand images
// it still needs the owner to supply (rendered blank until then). Mirrors the
// server registry in lib/server/docgen.ts (kept in sync by hand - a client file
// cannot import the server module).
// ---------------------------------------------------------------------------
const PARTNERS: { key: string; label: string; url: string }[] = [
  { key: 'ppp-tv', label: 'PPP TV', url: '/assets/partners/ppp-tv.png' },
  { key: 'xp-hub', label: 'XP Hub', url: '/assets/partners/xp-hub.png' },
  { key: 'synapse', label: 'Synapse', url: '/assets/partners/synapse.png' },
  { key: 'moyo', label: 'Moyo', url: '/assets/partners/moyo.png' },
  { key: 'ashton', label: 'Ashton', url: '/assets/partners/ashton.png' },
  { key: 'sauti-moto', label: 'Sauti Moto', url: '/assets/partners/sauti-moto.jpg' },
  { key: 'experience-hub', label: 'Experience Hub', url: '/assets/partners/experience-hub.png' },
  { key: 'vibe-studios', label: 'Vibe Studios', url: '/assets/partners/vibe-studios.webp' },
];

interface PField { key: string; label: string; area?: boolean; ph?: string }
interface PSpec {
  label: string; kind: 'post' | 'story' | 'poster';
  design: { w: number; h: number }; png: [number, number]; pdf?: boolean;
  fields: PField[]; heroSlots: string[]; partners?: boolean; missing?: string[];
}
const PROMO_SPEC: Record<string, PSpec> = {
  igNext: {
    label: 'IG Post - Next Stop', kind: 'post', design: { w: 600, h: 600 }, png: [1080, 1080],
    fields: [
      { key: 'dateDay', label: 'Date - day', ph: '19' }, { key: 'dateMonth', label: 'Date - month', ph: 'JULY' },
      { key: 'schoolName', label: 'School / event', ph: 'Lari Boys High Sch.' },
      { key: 'tagline1', label: 'Tagline 1', ph: 'Talent Day' }, { key: 'tagline2', label: 'Tagline 2', ph: '& Festival of Colours' },
      { key: 'lineup', label: 'Line-up', area: true, ph: 'HYPE OLA · DJ CARIAN · MC PAPS ...' },
    ], heroSlots: ['Host left', 'Host right', 'Circle left', 'Circle right'], missing: ['PPPtv Logo.png', 'tape-png-0.png'],
  },
  igStory: {
    label: 'IG Story - Term Calendar', kind: 'story', design: { w: 420, h: 747 }, png: [1080, 1920],
    fields: [
      { key: 'date1', label: 'Row 1 date', ph: '19th JUL' }, { key: 'school1', label: 'Row 1 event', ph: 'Lari Boys High School' }, { key: 'venue1', label: 'Row 1 venue', ph: 'KIMENDE' },
      { key: 'date2', label: 'Row 2 date', ph: '16th AUG' }, { key: 'school2', label: 'Row 2 event', ph: 'XP Hub Dance Event' }, { key: 'venue2', label: 'Row 2 venue', ph: 'NAIROBI' },
      { key: 'date3', label: 'Row 3 date', ph: '20th SEP' }, { key: 'school3', label: 'Row 3 event', ph: 'Festival of Colours' }, { key: 'venue3', label: 'Row 3 venue', ph: 'UHURU GARDENS' },
    ], heroSlots: ['Host left', 'Host right'], missing: ['tape-png-0.png', 'an-arrow-...webp'],
  },
  igWinner: {
    label: 'IG Post - Winner Spotlight', kind: 'post', design: { w: 560, h: 560 }, png: [1080, 1080],
    fields: [{ key: 'winnerLine', label: 'Winner name and category', ph: "winner's name · category" }], heroSlots: ['Winner photo'], missing: ['tape-png-0.png'],
  },
  igEpisode: {
    label: 'IG Post - New Episode', kind: 'post', design: { w: 560, h: 560 }, png: [1080, 1080],
    fields: [{ key: 'episodeTag', label: 'Episode tag', ph: 'EP. 07 · FRESH OFF THE ROAD' }], heroSlots: ['Screen photo'], missing: ['PPPtv Logo.png'],
  },
  igMerch: {
    label: 'IG Post - Merch Drop', kind: 'post', design: { w: 560, h: 560 }, png: [1080, 1080],
    fields: [{ key: 'headline', label: 'Headline', ph: 'The drip is in.' }, { key: 'subhead', label: 'Sub-headline', ph: 'worn on tour first. shipped countrywide.' }],
    heroSlots: ['Product left', 'Product right'], missing: ['tape-png-0.png'],
  },
  igBookings: {
    label: 'IG Post - Bookings Open', kind: 'post', design: { w: 560, h: 560 }, png: [1080, 1080],
    fields: [{ key: 'subhead', label: 'Sub-headline', ph: "principals, deans, student leaders - this one's for you." }], heroSlots: [], missing: ['an-arrow-...webp'],
  },
  igQuote: {
    label: 'IG Post - Quote Card', kind: 'post', design: { w: 560, h: 560 }, png: [1080, 1080],
    fields: [
      { key: 'volLabel', label: 'Volume label', ph: 'MONDAY FUEL · VOL. 07' },
      { key: 'quote', label: 'Quote', area: true, ph: '"potential is common. purpose is earned."' },
      { key: 'attribution', label: 'Attribution', ph: '- HEARD AT THE TALENT PODS' },
    ], heroSlots: [],
  },
  posTakeover: {
    label: 'Poster - The Takeover', kind: 'poster', design: { w: 560, h: 784 }, png: [1080, 1512], pdf: true,
    fields: [
      { key: 'dateDay', label: 'Date - day', ph: '26' }, { key: 'dateMonth', label: 'Date - month', ph: 'JULY' },
      { key: 'schoolName', label: 'School / event', ph: 'Ngeya Girls Senior Sch.' },
      { key: 'tagline1', label: 'Tagline 1', ph: 'Talent Day' }, { key: 'tagline2', label: 'Tagline 2', ph: '& Battle of the Crews' },
      { key: 'lineup', label: 'Line-up', area: true, ph: 'HYPE OLA · DJ CARIAN ...' },
    ], heroSlots: ['Feature artist', 'Circle 1', 'Circle 2', 'Circle 3'], partners: true, missing: ['PPPtv Logo.png', 'tape-png-0.png', 'an-arrow-...webp'],
  },
  posHeadliner: {
    label: 'Poster - Headliner', kind: 'poster', design: { w: 560, h: 784 }, png: [1080, 1512], pdf: true,
    fields: [
      { key: 'preheadline', label: 'Pre-headline', ph: 'the streets asked. we delivered.' },
      { key: 'dateChip', label: 'Date chip', ph: 'SAT 16 AUG' }, { key: 'venueChip', label: 'Venue chip', ph: 'XP HUB DANCE EVENT · KICC GROUNDS' }, { key: 'timeChip', label: 'Time chip', ph: '2 PM' },
    ], heroSlots: ['Background photo'],
  },
  posFestival: {
    label: 'Poster - Festival of Colours', kind: 'poster', design: { w: 560, h: 784 }, png: [1080, 1512], pdf: true,
    fields: [
      { key: 'dateDay', label: 'Date - day', ph: '20' }, { key: 'dateMonth', label: 'Date - month', ph: 'SEPT' },
      { key: 'titleTop', label: 'Title line 1', ph: 'Urban Festival' }, { key: 'titleBottom', label: 'Title line 2', ph: 'of Colours' },
      { key: 'dateChip', label: 'Date chip', ph: 'SUN 20 SEP' }, { key: 'venueChip', label: 'Venue chip', ph: 'UHURU GARDENS' }, { key: 'timeChip', label: 'Time chip', ph: 'FROM 11 AM' },
    ], heroSlots: ['Photo 1', 'Photo 2', 'Photo 3'], partners: true,
  },
  posRave: {
    label: 'Poster - Campus Rave', kind: 'poster', design: { w: 560, h: 784 }, png: [1080, 1512], pdf: true,
    fields: [
      { key: 'edition', label: 'Edition', ph: 'Nairobi Edition' },
      { key: 'dateChip', label: 'Date chip', ph: 'FRI 3 OCT' }, { key: 'venueChip', label: 'Venue chip', ph: 'CARNIVORE GROUNDS' }, { key: 'timeChip', label: 'Time chip', ph: '4 PM TILL LATE' },
      { key: 'lineup', label: 'Line-up', area: true, ph: 'DJ CARIAN · DJ XAVI ...' },
    ], heroSlots: [], missing: ['CAMPUS RAVE LOGO png.png'],
  },
  posFinale: {
    label: 'Poster - The Crowning Finale', kind: 'poster', design: { w: 560, h: 784 }, png: [1080, 1512], pdf: true,
    fields: [
      { key: 'dateChip', label: 'Date chip', ph: 'DATE TBA' }, { key: 'venueChip', label: 'Venue chip', ph: 'VENUE TBA' }, { key: 'tvChip', label: 'TV chip', ph: 'LIVE ON PPP TV' },
    ], heroSlots: ['Finalist 1', 'Finalist 2', 'Finalist 3'], partners: true,
  },
};
const PROMO_KEYS = Object.keys(PROMO_SPEC) as DocType[];
const PROMO_TYPES: { key: DocType; label: string }[] = PROMO_KEYS.map((k) => ({ key: k, label: PROMO_SPEC[k].label }));
const isPromoType = (t: DocType) => (PROMO_KEYS as string[]).includes(t);
function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'image';
}
// Multi-page documents: ONE serial, several pages rasterised into ONE PDF.
const isMultiPageType = (t: DocType) => t === 'prop' || t === 'sprop';
const isCertType = (t: DocType) => t === 'certw' || t === 'certp';
// Batch-by-quantity types: the admin enters a quantity N and a set of shared
// event fields; the system reserves N sequential serials, each item getting its
// own serial + its own verify QR. Output is a ZIP of N PDFs plus a serial CSV.
const isQtyType = (t: DocType) => t === 'tix' || t === 'spass' || t === 'band';
const QTY_NOUN: Record<string, string> = { tix: 'tickets', spass: 'passes', band: 'bands' };

// Doc page dimensions (px) - drives the live-preview iframe sizing. Body
// padding is 34px each side (see the templates' <body>), so the frame adds 68.
const DIMS: Record<DocType, { w: number; h: number }> = {
  invoice: { w: 794, h: 1123 },
  receipt: { w: 794, h: 430 },
  certw: { w: 1123, h: 794 },
  certp: { w: 1123, h: 794 },
  call: { w: 794, h: 1123 },
  budget: { w: 794, h: 1123 },
  tix: { w: 980, h: 356 },
  spass: { w: 980, h: 706 },
  band: { w: 960, h: 96 },
  ltr: { w: 794, h: 1123 },
  acc: { w: 794, h: 1123 },
  pass: { w: 640, h: 440 },
  rel: { w: 794, h: 1123 },
  cons: { w: 794, h: 1123 },
  // Proposals + agreement are A4 portrait. The proposals are 3 pages each; the
  // preview shows page 1 (the cover), the full run rasterises into one PDF.
  prop: { w: 794, h: 1123 },
  sprop: { w: 794, h: 1123 },
  agr: { w: 794, h: 1123 },
  // Promo cards are captured at their design px (see PROMO_SPEC.design) and
  // exported at PROMO_SPEC.png. The preview iframe uses these design px.
  igNext: { w: 600, h: 600 },
  igStory: { w: 420, h: 747 },
  igWinner: { w: 560, h: 560 },
  igEpisode: { w: 560, h: 560 },
  igMerch: { w: 560, h: 560 },
  igBookings: { w: 560, h: 560 },
  igQuote: { w: 560, h: 560 },
  posTakeover: { w: 560, h: 784 },
  posHeadliner: { w: 560, h: 784 },
  posFestival: { w: 560, h: 784 },
  posRave: { w: 560, h: 784 },
  posFinale: { w: 560, h: 784 },
};

// CSV column schema per certificate type (also the accepted header names).
const CSV_FIELDS: Record<'certw' | 'certp', string[]> = {
  certw: ['recipientName', 'category', 'stopName', 'eventDate'],
  certp: ['participantName', 'podName', 'stopName'],
};

interface LineRow { description: string; qty: string; rate: string }
const emptyRow = (): LineRow => ({ description: '', qty: '', rate: '' });

// Call sheet repeater rows.
interface CrewRow { name: string; role: string }
interface RosRow { time: string; segment: string; notes: string }
const emptyCrew = (): CrewRow => ({ name: '', role: '' });
const emptyRos = (): RosRow => ({ time: '', segment: '', notes: '' });

// Budget repeater rows.
interface InRow { source: string; count: string; rate: string }
interface OutRow { item: string; supplier: string; amount: string }
const emptyIn = (): InRow => ({ source: '', count: '', rate: '' });
const emptyOut = (): OutRow => ({ item: '', supplier: '', amount: '' });

// Seeded default for the Call Sheet form: the real "Lari Boys" event content
// extracted from template 44 so the admin starts from a real example and edits
// it, rather than an empty form (per spec).
const LARI_CALL = {
  eventName: 'Lari Boys High School', venue: 'Kimende', date: 'Sun 19 Jul',
  crewCall: '5:00 AM', dayRate: 'KSH 1,000', director: 'Mark Musumba', stageManager: 'Fred',
};
const LARI_CREW: CrewRow[] = [
  { name: 'Eugine Micah', role: 'Host & MC' },
  { name: 'Lucy Ogunde', role: 'Host & MC' },
  { name: 'Mark Musumba', role: 'Event Director' },
  { name: 'Fred', role: 'Stage Manager' },
  { name: 'Pauline Masika', role: 'Sound (hosts)' },
  { name: 'Hype Ola', role: 'Hype' },
  { name: 'Larry Raj', role: 'Hype / MC' },
  { name: 'MC Paps', role: 'MC support (role TBC)' },
  { name: 'King Tae', role: 'DJ' },
  { name: 'Kalamu Nyeusi', role: 'DJ' },
  { name: 'DJ 1', role: 'Full event' },
  { name: 'DJ 2', role: 'Talents & modelling' },
  { name: 'George Morgan', role: 'Video (full event)' },
  { name: 'Dinjo', role: 'Photo & YouTube raw' },
  { name: 'Rania Martin', role: 'Social lead & reels' },
  { name: 'Chiwaculture', role: 'Reels' },
  { name: 'Ferooz Mkenya', role: 'Driver, PPP TV' },
  { name: 'Esther Gakunju', role: 'Head, Synapse Models' },
  { name: 'Models x2', role: '1M / 1F' },
  { name: 'XP Hub Dancers x2', role: 'Dancers' },
  { name: 'Karembo', role: 'Dancer' },
];
const LARI_ROS: RosRow[] = [
  { time: '5:00', segment: 'Crew call', notes: 'Stage, sound, lights, branding build' },
  { time: '9:00', segment: 'Podcasts & talks', notes: '' },
  { time: '9:40', segment: 'Tree planting', notes: 'Scouts + Green Movement' },
  { time: '10:00', segment: 'Opening', notes: 'Prayers, anthems, principal speech, scouts' },
  { time: '10:30', segment: 'Eugine & Lucy intro', notes: 'Dancers, DJs & crew introduced' },
  { time: '10:50', segment: "Hosts' hype + Hype Ola set", notes: '' },
  { time: '11:10', segment: 'Rap battle', notes: '' },
  { time: '11:40', segment: 'Modelling walk I', notes: 'Synapse leads' },
  { time: '12:00', segment: 'Dance battle', notes: '' },
  { time: '12:35', segment: 'Spoken word', notes: 'Poetry, narratives' },
  { time: '13:00', segment: 'Modelling walk II', notes: 'Hype set by Larry Raj' },
  { time: '13:30', segment: 'Lunch', notes: 'Crew eats in shifts, stage never empty' },
  { time: '14:00', segment: 'Hype set, Eugine & Lucy', notes: 'Music battle' },
  { time: '14:45', segment: 'Public speaking', notes: 'News reporting, comedy' },
  { time: '15:30', segment: 'Awards & crowning', notes: 'Certificates ready side-stage' },
  { time: '16:10', segment: "Teachers' dance battle", notes: 'Crowd favourite' },
  { time: '16:25', segment: 'Colour festival I', notes: 'Safety pins checked, wind called by Fred' },
  { time: '16:35', segment: 'Musicians', notes: 'Musician 1, 2, main musician' },
  { time: '17:25', segment: 'Colour festival II', notes: 'Event ends, strike & load-out' },
];
const LARI_DONTFORGET = [
  'Cylinder safety pins',
  'Powder cans x12',
  'Certificates',
  'Gifts (Mr Flex)',
  'Posters up by 8 AM',
  'Nganya parked by 9 AM',
  'Deposit receipt copy for the office',
];

// Seeded default for the Budget form: the template's own line-item labels with
// empty figures, so the admin fills real numbers and the server computes totals.
const BUDGET_IN_SEED: InRow[] = [
  { source: 'Host school students', count: '', rate: '' },
  { source: 'Attending schools / gate', count: '', rate: '' },
  { source: 'Sponsors / partners', count: '', rate: '' },
];
const BUDGET_OUT_SEED: OutRow[] = [
  { item: 'Stage', supplier: '', amount: '' },
  { item: 'Sound & PA', supplier: '', amount: '' },
  { item: 'Guest musician(s)', supplier: '', amount: '' },
  { item: 'Colour festival (cylinders, powder, pins)', supplier: '', amount: '' },
  { item: 'Transport / nganya', supplier: '', amount: '' },
  { item: 'Crew day rates', supplier: '', amount: '' },
  { item: 'Certificates, posters, gifts', supplier: '', amount: '' },
  { item: 'Meals & water, crew', supplier: '', amount: '' },
  { item: 'Contingency', supplier: '', amount: '' },
];

interface RecentDoc {
  id: string; serial: string; type: string; issued_to: string; event: string;
  status: string; created_at: string; pdf_url: string; png_url: string; void_reason: string;
}

function num(v: string): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmtKsh(n: number): string { return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function today(): string { return new Date().toISOString().slice(0, 10); }

export default function DocGen() {
  const [type, setType] = useState<DocType>('invoice');
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Invoice form
  const [inv, setInv] = useState({
    date: today(), dueDate: '', billTo: '', poNumber: '', eventProject: '',
    discount: '', mpesaTill: '', accountName: '', bankDetails: '',
  });
  const [rows, setRows] = useState<LineRow[]>([emptyRow()]);

  // Receipt form
  const [rct, setRct] = useState({
    date: today(), receivedFrom: '', amountFigures: '', beingPaymentFor: '',
    method: 'M-PESA', transactionRef: '', balanceDue: '', invoiceNo: '', receivedBy: '',
  });

  // Winner certificate form
  const [cw, setCw] = useState({ recipientName: '', category: '', stopName: '', eventDate: today() });
  // Participation certificate form
  const [cp, setCp] = useState({ participantName: '', podName: '', stopName: '' });

  // Call sheet form (pre-seeded with the real Lari Boys example).
  const [call, setCall] = useState({ ...LARI_CALL });
  const [crew, setCrew] = useState<CrewRow[]>(LARI_CREW.map((r) => ({ ...r })));
  const [ros, setRos] = useState<RosRow[]>(LARI_ROS.map((r) => ({ ...r })));
  const [dontForget, setDontForget] = useState<string[]>([...LARI_DONTFORGET]);

  // Budget form. Figures start empty; totals + profit are computed server-side.
  const [bud, setBud] = useState({ eventName: '', date: today(), preparedBy: '', savingsPercent: '', crewCount: '', crewRate: '' });
  const [moneyIn, setMoneyIn] = useState<InRow[]>(BUDGET_IN_SEED.map((r) => ({ ...r })));
  const [moneyOut, setMoneyOut] = useState<OutRow[]>(BUDGET_OUT_SEED.map((r) => ({ ...r })));

  // Event ticket form. schoolStop locks the tier to GA (single-tier rule); the
  // server also rejects any VIP + schoolStop request.
  const [tix, setTix] = useState({ eventName: '', venue: '', date: '', gateTime: '', tier: 'GA', schoolStop: false });
  // Student pass form (inherently single-tier).
  const [spass, setSpass] = useState({ eventName: '', schoolName: '', date: '' });
  // Wristband form. bandType picks the artwork (GA/VIP/Crew event bands; Student
  // school band with school + date).
  const [band, setBand] = useState({ bandType: 'GA', eventName: '', schoolName: '', date: '' });

  // Single-page letters and forms.
  const [ltr, setLtr] = useState({ schoolName: '', principalSalutation: '', winnerNames: '', winnerCategory: '', date: today() });
  const [acc, setAcc] = useState({
    fullName: '', idNumber: '', outlet: '', handle: '', phone: '', email: '',
    event: '', date: today(), equipment: '', approvedBy: '',
    coveringAs: [] as string[],
  });
  const [pass, setPass] = useState({ vehicleReg: '', driver: '', event: '', date: '', zone: 'Stage' });
  const [rel, setRel] = useState({
    talentName: '', age: '', school: '', category: '', event: '', date: today(),
    guardianName: '', relationship: '', phone: '', linkedCertSerial: '',
  });
  const [cons, setCons] = useState({ schoolName: '', schoolAddress: '', eventDate: today(), returnByDate: '' });

  // Multi-page proposals (3 pages each, one serial). Only the cover carries
  // blanks; the pitch/package pages are fixed content.
  const [prop, setProp] = useState({ preparedFor: '', preparedBy: '', date: today() });
  const [sprop, setSprop] = useState({ schoolName: '', attention: '', date: today(), eventDate: '' });
  // Sponsorship agreement (single page, real contract). lane single-select,
  // rightsGranted multi-select, fee/in-kind are agreed KSH figures.
  const [agr, setAgr] = useState({
    sponsorName: '', sponsorAddress: '', contactPerson: '', coverage: '',
    lane: 'Title', rightsGranted: [] as string[], exclusivityCategory: '',
    feeKsh: '', inKindValue: '', paymentTerms: '', balanceDueDate: '',
  });

  // Promo / social state. A single text map (only the active type's fields are
  // used; a blank field keeps the template default), plus positional hero image
  // Blob URLs and picked partner-logo keys/URLs. Reset on every type switch.
  const [promo, setPromo] = useState<Record<string, string>>({});
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [partnerLogos, setPartnerLogos] = useState<string[]>([]);

  // Quantity-batch state (tickets / passes / bands).
  const [qty, setQty] = useState('3');
  const [qtyBusy, setQtyBusy] = useState(false);
  const [qtyProgress, setQtyProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [qtyResult, setQtyResult] = useState<{ serials?: string[]; zipUrl?: string; zipName?: string; csvUrl?: string; csvName?: string; error?: string } | null>(null);

  // CSV batch state
  const [csvName, setCsvName] = useState('');
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvError, setCsvError] = useState('');
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [batchResult, setBatchResult] = useState<{ serials?: string[]; zipUrl?: string; zipName?: string; error?: string } | null>(null);

  const [previewHtml, setPreviewHtml] = useState('');
  const [computed, setComputed] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState(false);
  const [result, setResult] = useState<{ serial: string; pdf_url: string; filename: string; png_url?: string; isPromo?: boolean } | null>(null);
  const [toast, setToast] = useState('');
  const [recent, setRecent] = useState<RecentDoc[]>([]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const batchMode = isCertType(type) && mode === 'batch';

  // The single-form payload for this type (preview + single Generate).
  const singlePayload = useMemo(() => {
    if (isPromoType(type)) {
      const spec = PROMO_SPEC[type];
      const out: Record<string, unknown> = {};
      // Only non-empty text fields are sent, so a blank keeps the template
      // default. heroImages is a DENSE positional array ('' = keep default slot).
      for (const f of spec.fields) { const v = promo[f.key]; if (v !== undefined && v !== '') out[f.key] = v; }
      if (promo.eventName) out.eventName = promo.eventName;
      out.heroImages = spec.heroSlots.map((_, i) => heroImages[i] || '');
      out.partnerLogos = partnerLogos;
      return out;
    }
    if (type === 'invoice') {
      return {
        date: inv.date, dueDate: inv.dueDate, billTo: inv.billTo, poNumber: inv.poNumber,
        eventProject: inv.eventProject, discount: num(inv.discount),
        mpesaTill: inv.mpesaTill, accountName: inv.accountName, bankDetails: inv.bankDetails,
        lineItems: rows
          .filter((r) => r.description || r.qty || r.rate)
          .map((r) => ({ description: r.description, qty: num(r.qty), rate: num(r.rate) })),
      } as Record<string, unknown>;
    }
    if (type === 'receipt') {
      return {
        date: rct.date, receivedFrom: rct.receivedFrom, amountFigures: num(rct.amountFigures),
        beingPaymentFor: rct.beingPaymentFor, method: rct.method, transactionRef: rct.transactionRef,
        balanceDue: rct.balanceDue === '' ? '' : num(rct.balanceDue), invoiceNo: rct.invoiceNo, receivedBy: rct.receivedBy,
      };
    }
    if (type === 'certw') {
      return { recipientName: cw.recipientName, category: cw.category, stopName: cw.stopName, eventDate: cw.eventDate };
    }
    if (type === 'certp') {
      return { participantName: cp.participantName, podName: cp.podName, stopName: cp.stopName };
    }
    if (type === 'call') {
      return {
        eventName: call.eventName, venue: call.venue, date: call.date, crewCall: call.crewCall,
        dayRate: call.dayRate, director: call.director, stageManager: call.stageManager,
        crew: crew.filter((c) => c.name || c.role),
        runOfShow: ros.filter((r) => r.time || r.segment || r.notes),
        dontForget: dontForget.filter((d) => d.trim()),
      } as Record<string, unknown>;
    }
    if (type === 'tix') {
      return {
        eventName: tix.eventName, venue: tix.venue, date: tix.date, gateTime: tix.gateTime,
        tier: tix.schoolStop ? 'GA' : tix.tier, schoolStop: tix.schoolStop,
      } as Record<string, unknown>;
    }
    if (type === 'spass') {
      return { eventName: spass.eventName, schoolName: spass.schoolName, date: spass.date } as Record<string, unknown>;
    }
    if (type === 'band') {
      return { bandType: band.bandType, eventName: band.eventName, schoolName: band.schoolName, date: band.date } as Record<string, unknown>;
    }
    if (type === 'ltr') {
      return {
        schoolName: ltr.schoolName, principalSalutation: ltr.principalSalutation,
        winnerNames: ltr.winnerNames, winnerCategory: ltr.winnerCategory, date: ltr.date,
      } as Record<string, unknown>;
    }
    if (type === 'acc') {
      return {
        fullName: acc.fullName, idNumber: acc.idNumber, outlet: acc.outlet, handle: acc.handle,
        phone: acc.phone, email: acc.email, event: acc.event, date: acc.date,
        equipment: acc.equipment, approvedBy: acc.approvedBy, coveringAs: acc.coveringAs,
      } as Record<string, unknown>;
    }
    if (type === 'pass') {
      return { vehicleReg: pass.vehicleReg, driver: pass.driver, event: pass.event, date: pass.date, zone: pass.zone } as Record<string, unknown>;
    }
    if (type === 'rel') {
      return {
        talentName: rel.talentName, age: rel.age === '' ? '' : num(rel.age), school: rel.school,
        category: rel.category, event: rel.event, date: rel.date,
        guardianName: rel.guardianName, relationship: rel.relationship, phone: rel.phone,
        linkedCertSerial: rel.linkedCertSerial,
      } as Record<string, unknown>;
    }
    if (type === 'cons') {
      return { schoolName: cons.schoolName, schoolAddress: cons.schoolAddress, eventDate: cons.eventDate, returnByDate: cons.returnByDate } as Record<string, unknown>;
    }
    if (type === 'prop') {
      return { preparedFor: prop.preparedFor, preparedBy: prop.preparedBy, date: prop.date } as Record<string, unknown>;
    }
    if (type === 'sprop') {
      return { schoolName: sprop.schoolName, attention: sprop.attention, date: sprop.date, eventDate: sprop.eventDate } as Record<string, unknown>;
    }
    if (type === 'agr') {
      return {
        sponsorName: agr.sponsorName, sponsorAddress: agr.sponsorAddress, contactPerson: agr.contactPerson,
        coverage: agr.coverage, lane: agr.lane, rightsGranted: agr.rightsGranted,
        exclusivityCategory: agr.exclusivityCategory,
        feeKsh: agr.feeKsh === '' ? '' : num(agr.feeKsh),
        inKindValue: agr.inKindValue === '' ? '' : num(agr.inKindValue),
        paymentTerms: agr.paymentTerms, balanceDueDate: agr.balanceDueDate,
      } as Record<string, unknown>;
    }
    // budget
    return {
      eventName: bud.eventName, date: bud.date, preparedBy: bud.preparedBy,
      savingsPercent: num(bud.savingsPercent),
      crewCount: bud.crewCount === '' ? '' : num(bud.crewCount),
      crewRate: bud.crewRate === '' ? '' : num(bud.crewRate),
      moneyIn: moneyIn.filter((r) => r.source || r.count || r.rate).map((r) => ({ source: r.source, count: num(r.count), rate: num(r.rate) })),
      moneyOut: moneyOut.filter((r) => r.item || r.supplier || r.amount).map((r) => ({ item: r.item, supplier: r.supplier, amount: num(r.amount) })),
    } as Record<string, unknown>;
  }, [type, inv, rows, rct, cw, cp, call, crew, ros, dontForget, bud, moneyIn, moneyOut, tix, spass, band, ltr, acc, pass, rel, cons, prop, sprop, agr, promo, heroImages, partnerLogos]);

  // What the live preview renders: in batch mode, the first parsed row; else
  // the single-form payload.
  const previewPayload = useMemo(
    () => (batchMode && csvRows.length > 0 ? csvRows[0] : singlePayload),
    [batchMode, csvRows, singlePayload]
  );

  // Preview only when the identity field for a certificate is present (an empty
  // required field would make /preview 400). Money docs have no required field.
  const previewReady = useMemo(() => {
    const p: any = previewPayload;
    if (isPromoType(type)) return true; // promo has no required field
    if (type === 'certw') return !!String(p?.recipientName || '').trim();
    if (type === 'certp') return !!String(p?.participantName || '').trim();
    if (type === 'tix' || type === 'spass') return !!String(p?.eventName || '').trim();
    if (type === 'ltr' || type === 'cons' || type === 'sprop') return !!String(p?.schoolName || '').trim();
    if (type === 'acc') return !!String(p?.fullName || '').trim();
    if (type === 'prop') return !!String(p?.preparedFor || '').trim();
    if (type === 'agr') return !!String(p?.sponsorName || '').trim();
    if (type === 'pass') return !!String(p?.vehicleReg || '').trim();
    if (type === 'rel') {
      // Need talentName + age; and, for a minor, the full guardian block - so the
      // preview mirrors the server's fail-closed rule instead of 400-flashing.
      const nameOk = !!String(p?.talentName || '').trim();
      const ageStr = String(p?.age ?? '').trim();
      if (!nameOk || ageStr === '') return false;
      const age = Number(ageStr);
      if (Number.isFinite(age) && age < 18) {
        return !!String(p?.guardianName || '').trim() && !!String(p?.relationship || '').trim() && !!String(p?.phone || '').trim();
      }
      return true;
    }
    return true;
  }, [type, previewPayload]);

  // Ensure brand fonts are present in the admin document so the hidden capture
  // node (which is mounted in THIS document, not the iframe) renders correctly.
  useEffect(() => {
    if (!document.querySelector('link[data-docgen-fonts]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = FONT_HREF; l.setAttribute('data-docgen-fonts', '1');
      document.head.appendChild(l);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    const { data } = await api('/api/admin/docs/list');
    if (data?.rows) setRecent(data.rows);
  }, []);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  // Debounced live preview.
  const payloadKey = JSON.stringify({ type, previewPayload, previewReady });
  useEffect(() => {
    if (!previewReady) { setPreviewHtml(''); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      const { status, data } = await api('/api/admin/docs/preview', { method: 'POST', body: JSON.stringify({ type, payload: previewPayload }) });
      if (cancelled) return;
      setBusy(false);
      if (status === 200 && data.html) { setPreviewHtml(data.html); setComputed(data.computed || {}); }
      else if (data?.error) say('Preview: ' + data.error);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [payloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function switchType(t: DocType) {
    setType(t); setResult(null); setMode('single');
    setCsvRows([]); setCsvName(''); setCsvError(''); setBatchResult(null);
    setQtyResult(null); setQtyProgress({ done: 0, total: 0 });
    setPromo({}); setHeroImages([]); setPartnerLogos([]);
  }

  async function doGenerate() {
    if (gen) return;
    setGen(true); setResult(null);
    try {
      // Phase 1: reserve the real serial + get the filled HTML.
      const r1 = await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ type, payload: singlePayload }) });
      if (r1.status !== 200 || (!r1.data?.html && !r1.data?.pages)) { say('Generate failed: ' + (r1.data?.error || r1.status)); setGen(false); return; }
      const { id, serial, html, pages, filename } = r1.data;

      // Promo pieces export PNG at their social size (posters also an A3 PDF);
      // png is the primary stored asset, pdf only for posters.
      if (isPromoType(type)) {
        const spec = PROMO_SPEC[type];
        const { pngDataUrl, pdfDataUrl } = await rasterisePromo(html, spec.png, !!spec.pdf);
        const r2 = await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ id, pngBase64: pngDataUrl, pdfBase64: pdfDataUrl }) });
        if (r2.status !== 200 || !r2.data?.png_url) { say('Upload failed: ' + (r2.data?.error || r2.status)); setGen(false); return; }
        setResult({ serial, png_url: r2.data.png_url, pdf_url: r2.data.pdf_url || '', filename, isPromo: true });
        say('Generated ' + serial);
        loadRecent();
        return;
      }

      // Single-page types return one filled HTML (html); multi-page types
      // (proposals) return an array of page HTMLs (pages) that rasterise into
      // ONE multi-page PDF stored under this one serial + record.
      const { pngDataUrl, pdfDataUrl } = Array.isArray(pages)
        ? await rasteriseMultiPage(pages)
        : await rasterise(html);

      // Phase 2: attach the rendered pdf/png to the reserved record.
      const r2 = await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ id, pdfBase64: pdfDataUrl, pngBase64: pngDataUrl }) });
      if (r2.status !== 200 || !r2.data?.pdf_url) { say('Upload failed: ' + (r2.data?.error || r2.status)); setGen(false); return; }

      setResult({ serial, pdf_url: r2.data.pdf_url, filename });
      say('Generated ' + serial);
      loadRecent();
    } catch (e: any) {
      say('Generate error: ' + (e?.message || 'unknown'));
    } finally {
      setGen(false);
    }
  }

  function onCsvFile(file: File) {
    setCsvError(''); setBatchResult(null); setCsvName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const matrix = parseCsv(String(reader.result || ''));
        const objs = rowsToObjects(type as 'certw' | 'certp', matrix);
        if (objs.length === 0) { setCsvRows([]); setCsvError('No data rows found in the CSV.'); return; }
        if (objs.length > 300) { setCsvRows([]); setCsvError('Too many rows (' + objs.length + '). Max 300 per batch.'); return; }
        setCsvRows(objs);
      } catch (e: any) {
        setCsvRows([]); setCsvError('Could not parse CSV: ' + (e?.message || 'unknown'));
      }
    };
    reader.onerror = () => setCsvError('Could not read the file.');
    reader.readAsText(file);
  }

  async function doBatch() {
    if (batchBusy || csvRows.length === 0) return;
    setBatchBusy(true); setBatchResult(null); setBatchProgress({ done: 0, total: csvRows.length });
    try {
      // Phase 1: reserve all serials at once. The server validates EVERY row
      // before issuing any serial, so an invalid row reserves nothing.
      const r = await api('/api/admin/docs/batch', { method: 'POST', body: JSON.stringify({ type, rows: csvRows }) });
      if (r.status !== 200 || !r.data?.docs) {
        const d = r.data || {};
        const msg = d.error === 'row_invalid'
          ? `Row ${(d.row ?? 0) + 1} is invalid (${d.detail}). No certificates were issued - fix the CSV and try again.`
          : 'Batch failed: ' + (d.error || r.status);
        setBatchResult({ error: msg }); say(msg); setBatchBusy(false); return;
      }
      const docs: Array<{ id: string; serial: string; html: string; filename: string }> = r.data.docs;

      // Phase 2: rasterise + attach each, collecting PDFs for one ZIP.
      const entries: { name: string; data: Uint8Array }[] = [];
      const serials: string[] = [];
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        const { pngDataUrl, pdfDataUrl } = await rasterise(d.html);
        await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ id: d.id, pdfBase64: pdfDataUrl, pngBase64: pngDataUrl }) });
        entries.push({ name: d.filename, data: dataUrlToBytes(pdfDataUrl) });
        serials.push(d.serial);
        setBatchProgress({ done: i + 1, total: docs.length });
      }

      const zipBlob = buildZipStore(entries);
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipName = `certificates-${type}-${today()}.zip`;
      setBatchResult({ serials, zipUrl, zipName });
      say('Generated ' + serials.length + ' certificates');
      loadRecent();
    } catch (e: any) {
      const msg = 'Batch error: ' + (e?.message || 'unknown');
      setBatchResult({ error: msg }); say(msg);
    } finally {
      setBatchBusy(false);
    }
  }

  // Quantity batch (tickets / passes / bands): reserve N sequential serials from
  // one set of shared event fields, each item getting its own serial + QR.
  // Reuses the same /batch endpoint the certificates use (build N identical rows
  // from the shared fields), then rasterises each, zips the PDFs and emits a
  // serial-list CSV manifest for the gate / box office / print vendor.
  async function doQtyBatch() {
    if (qtyBusy) return;
    const n = Math.max(1, Math.min(300, Math.round(num(qty)) || 1));
    setQtyBusy(true); setQtyResult(null); setQtyProgress({ done: 0, total: n });
    try {
      const shared = singlePayload as Record<string, any>;
      const rows = Array.from({ length: n }, () => ({ ...shared }));
      // Phase 1: reserve all serials at once (server validates every row first,
      // so an invalid config - e.g. VIP on a school stop - reserves nothing).
      const r = await api('/api/admin/docs/batch', { method: 'POST', body: JSON.stringify({ type, rows }) });
      if (r.status !== 200 || !r.data?.docs) {
        const d = r.data || {};
        const msg = d.error === 'row_invalid'
          ? `Rejected: ${d.detail || 'invalid'}. Nothing was issued.`
          : 'Batch failed: ' + (d.error || r.status);
        setQtyResult({ error: msg }); say(msg); setQtyBusy(false); return;
      }
      const docs: Array<{ id: string; serial: string; html: string; filename: string }> = r.data.docs;

      // Bands print at exactly 254 x 25 mm (spec) at ~300+ dpi; tickets/passes
      // capture at 3x for crisp print.
      const rOpts = type === 'band'
        ? { pixelRatio: 4, pageFormatMm: [254, 25] as [number, number] }
        : { pixelRatio: 3 };

      const entries: { name: string; data: Uint8Array }[] = [];
      const serials: string[] = [];
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        const { pngDataUrl, pdfDataUrl } = await rasterise(d.html, rOpts);
        await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ id: d.id, pdfBase64: pdfDataUrl, pngBase64: pngDataUrl }) });
        entries.push({ name: d.filename, data: dataUrlToBytes(pdfDataUrl) });
        serials.push(d.serial);
        setQtyProgress({ done: i + 1, total: docs.length });
      }

      const zipBlob = buildZipStore(entries);
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipName = `${type}-${today()}.zip`;
      const csvBlob = new Blob([buildSerialCsv(type, serials, shared)], { type: 'text/csv;charset=utf-8' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvName = `${type}-serials-${today()}.csv`;
      setQtyResult({ serials, zipUrl, zipName, csvUrl, csvName });
      say('Generated ' + serials.length + ' ' + (QTY_NOUN[type] || 'items'));
      loadRecent();
    } catch (e: any) {
      const msg = 'Batch error: ' + (e?.message || 'unknown');
      setQtyResult({ error: msg }); say(msg);
    } finally {
      setQtyBusy(false);
    }
  }

  async function voidDoc(serial: string) {
    const reason = window.prompt('Reason for voiding ' + serial + '? (a correction is a new document, never an edit)');
    if (reason === null) return;
    const { status, data } = await api('/api/admin/docs/void', { method: 'POST', body: JSON.stringify({ serial, reason }) });
    if (status === 200) { say('Voided ' + serial); loadRecent(); }
    else say('Void failed: ' + (data?.error || status));
  }

  const formTitle = isPromoType(type) ? PROMO_SPEC[type].label
    : type === 'invoice' ? 'Invoice details'
    : type === 'receipt' ? 'Receipt details'
    : type === 'certw' ? 'Winner certificate'
    : type === 'certp' ? 'Participation certificate'
    : type === 'call' ? 'Call sheet & run of show'
    : type === 'tix' ? 'Event ticket (batch by quantity)'
    : type === 'spass' ? 'Student pass (batch by quantity)'
    : type === 'band' ? 'Wristband (batch by quantity)'
    : type === 'ltr' ? 'Thank-you letter to a school'
    : type === 'acc' ? 'Media accreditation'
    : type === 'pass' ? 'Gate / vehicle pass'
    : type === 'rel' ? 'Talent media release'
    : type === 'cons' ? 'Parental consent letter'
    : type === 'prop' ? 'Partnership proposal (3 pages)'
    : type === 'sprop' ? 'School proposal (3 pages)'
    : type === 'agr' ? 'Sponsorship agreement' : 'Event budget sheet';

  const qtyN = Math.max(1, Math.min(300, Math.round(num(qty)) || 1));
  const qtyReady = type === 'band' ? true : !!String((singlePayload as any)?.eventName || '').trim();

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {toast && <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, ...card, padding: '10px 16px', background: '#FFD400' }}>{toast}</div>}

      <div style={card}>
        <h2 style={{ fontFamily: 'Anton', margin: '0 0 4px', fontSize: 22 }}>Document Generator</h2>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
          Brand-locked, serialised, QR-verifiable documents. Serials and totals are computed by the server, never typed. Finalised documents are immutable - to correct one, void it and generate a new one.
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#888', margin: '2px 0 6px' }}>Documents (PDF)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => switchType(t.key)}
              style={{ ...btn, background: type === t.key ? '#C7238E' : '#fff', color: type === t.key ? '#fff' : '#111' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#888', margin: '14px 0 6px' }}>Promo / Social (PNG)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PROMO_TYPES.map((t) => (
            <button key={t.key} onClick={() => switchType(t.key)}
              style={{ ...btn, background: type === t.key ? '#111' : '#fff', color: type === t.key ? '#fff' : '#111' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) minmax(300px,1.15fr)', gap: 14, alignItems: 'start' }}>
        {/* -------- FORM / BATCH -------- */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ ...h3, margin: 0 }}>{formTitle}</h3>
            {isCertType(type) && (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['single', 'batch'] as const).map((m) => (
                  <button key={m} onClick={() => { setMode(m); setResult(null); setBatchResult(null); }}
                    style={{ ...btnSmall, background: mode === m ? '#111' : '#fff', color: mode === m ? '#fff' : '#111' }}>
                    {m === 'single' ? 'Single' : 'Batch from CSV'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {batchMode ? (
            <BatchPanel
              type={type as 'certw' | 'certp'}
              csvName={csvName} csvRows={csvRows} csvError={csvError}
              onFile={onCsvFile} onGenerate={doBatch}
              busy={batchBusy} progress={batchProgress} result={batchResult}
              onClear={() => { setCsvRows([]); setCsvName(''); setCsvError(''); setBatchResult(null); }}
            />
          ) : (
            <>
              <div style={{ marginTop: 12 }}>
                {type === 'invoice' && <InvoiceForm inv={inv} setInv={setInv} rows={rows} setRows={setRows} computed={computed} />}
                {type === 'receipt' && <ReceiptForm rct={rct} setRct={setRct} computed={computed} />}
                {type === 'certw' && <CertWForm cw={cw} setCw={setCw} />}
                {type === 'certp' && <CertPForm cp={cp} setCp={setCp} />}
                {type === 'call' && <CallSheetForm call={call} setCall={setCall} crew={crew} setCrew={setCrew} ros={ros} setRos={setRos} dontForget={dontForget} setDontForget={setDontForget} />}
                {type === 'budget' && <BudgetForm bud={bud} setBud={setBud} moneyIn={moneyIn} setMoneyIn={setMoneyIn} moneyOut={moneyOut} setMoneyOut={setMoneyOut} computed={computed} />}
                {type === 'tix' && <TicketForm tix={tix} setTix={setTix} />}
                {type === 'spass' && <StudentPassForm spass={spass} setSpass={setSpass} />}
                {type === 'band' && <BandForm band={band} setBand={setBand} />}
                {type === 'ltr' && <LetterForm ltr={ltr} setLtr={setLtr} />}
                {type === 'acc' && <AccreditationForm acc={acc} setAcc={setAcc} />}
                {type === 'pass' && <GatePassForm pass={pass} setPass={setPass} />}
                {type === 'rel' && <ReleaseForm rel={rel} setRel={setRel} computed={computed} />}
                {type === 'cons' && <ConsentForm cons={cons} setCons={setCons} />}
                {type === 'prop' && <ProposalForm prop={prop} setProp={setProp} />}
                {type === 'sprop' && <SchoolProposalForm sprop={sprop} setSprop={setSprop} />}
                {type === 'agr' && <AgreementForm agr={agr} setAgr={setAgr} />}
                {isPromoType(type) && (
                  <PromoForm
                    type={type} promo={promo} setPromo={setPromo}
                    heroImages={heroImages} setHeroImages={setHeroImages}
                    partnerLogos={partnerLogos} setPartnerLogos={setPartnerLogos} say={say}
                  />
                )}
              </div>

              {isQtyType(type) ? (
                <QtyControls
                  noun={QTY_NOUN[type]} qty={qty} setQty={setQty} n={qtyN} ready={qtyReady} previewBusy={busy}
                  busy={qtyBusy} progress={qtyProgress} result={qtyResult} onGenerate={doQtyBatch}
                />
              ) : (
                <>
                  <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={doGenerate} disabled={gen} style={{ ...btnMagenta, opacity: gen ? 0.6 : 1 }}>
                      {gen ? 'Generating...' : 'Generate document'}
                    </button>
                    {busy && <span style={{ fontSize: 12, color: '#999' }}>updating preview...</span>}
                  </div>

                  {result && (
                    <div style={{ marginTop: 14, border: '2px solid #1F8A5B', borderRadius: 12, padding: 14, background: '#f2fbf6' }}>
                      <div style={{ fontFamily: 'Anton', fontSize: 16, color: '#1F8A5B' }}>Generated: {result.serial}</div>
                      {result.isPromo ? (
                        <>
                          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                            <a href={result.png_url} download={result.filename} style={{ ...btnMagenta, textDecoration: 'none' }}>Download PNG</a>
                            {result.pdf_url && <a href={result.pdf_url} download={result.filename.replace(/\.png$/, '')+'-A3.pdf'} style={{ ...btnDark, textDecoration: 'none' }}>Download A3 PDF</a>}
                          </div>
                          <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>Promo pieces carry no verify QR (a poster with a verify code is odd). Saved to the record for re-download.</div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                            <a href={result.pdf_url} download={result.filename} style={{ ...btn, textDecoration: 'none' }}>Download PDF</a>
                            <a href={VERIFY_BASE + result.serial} target="_blank" rel="noreferrer" style={{ ...btnDark, textDecoration: 'none' }}>Open verify page</a>
                          </div>
                          <div style={{ fontSize: 12, color: '#555', marginTop: 8, wordBreak: 'break-all' }}>
                            Verify URL: {VERIFY_BASE + result.serial}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* -------- LIVE PREVIEW -------- */}
        <div style={card}>
          <h3 style={h3}>Live preview</h3>
          <Preview html={previewHtml} docType={type} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
            {batchMode
              ? 'Preview shows the first CSV row. Real serials are issued only when you Generate All.'
              : isQtyType(type)
                ? 'Preview shows one item with a provisional serial. The run of N real serials + QRs is issued only when you Generate.'
                : 'Preview uses a provisional serial. The real serial is issued only when you click Generate.'}
          </div>
        </div>
      </div>

      {/* -------- RECENT -------- */}
      <div style={card}>
        <h3 style={h3}>Recent documents</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr>
              <th style={th}>Serial</th><th style={th}>Type</th><th style={th}>Issued to</th>
              <th style={th}>Date</th><th style={th}>Status</th><th style={th}>Actions</th>
            </tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td style={td} colSpan={6}>No documents yet.</td></tr>}
              {recent.map((d) => (
                <tr key={d.id}>
                  <td style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap' }}>{d.serial}</td>
                  <td style={td}>{d.type}</td>
                  <td style={td}>{d.issued_to || '-'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{String(d.created_at).slice(0, 10)}</td>
                  <td style={td}>
                    {d.status === 'void'
                      ? <Chip text="VOID" bg="#fdecec" color="#C62828" />
                      : <Chip text="VALID" bg="#e8f6ef" color="#1F8A5B" />}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {d.pdf_url && <a href={d.pdf_url} target="_blank" rel="noreferrer" style={{ ...btnSmall, textDecoration: 'none', marginRight: 6 }}>PDF</a>}
                    {isPromoType(d.type as DocType) && d.png_url && <a href={d.png_url} target="_blank" rel="noreferrer" style={{ ...btnSmall, textDecoration: 'none', marginRight: 6 }}>PNG</a>}
                    {!isPromoType(d.type as DocType) && <a href={VERIFY_BASE + d.serial} target="_blank" rel="noreferrer" style={{ ...btnSmall, background: '#111', color: '#fff', textDecoration: 'none', marginRight: 6 }}>Verify</a>}
                    {d.status !== 'void' && <button onClick={() => voidDoc(d.serial)} style={{ ...btnSmall, background: '#C62828', color: '#fff' }}>Void</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client-side rasterisation: filled HTML string -> {pngDataUrl, pdfDataUrl}.
// Mounts the [data-doc-page] node off-screen in THIS document, waits for its
// images + brand fonts, snapshots at 2x, wraps into a page-sized PDF.
// ---------------------------------------------------------------------------
async function rasterise(
  html: string,
  opts: { pixelRatio?: number; pageFormatMm?: [number, number] } = {}
): Promise<{ pngDataUrl: string; pdfDataUrl: string }> {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const page = parsed.querySelector('[data-doc-page]') as HTMLElement | null;
  if (!page) throw new Error('no_doc_page');

  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff;';
  const node = document.importNode(page, true) as HTMLElement;
  holder.appendChild(node);
  document.body.appendChild(holder);

  try {
    // wait for images (logo, pattern, QR data-url) to decode. Missing brand
    // decorations resolve on error so a broken img never hangs the capture.
    const imgs = Array.from(node.querySelectorAll('img'));
    await Promise.all(imgs.map((img) => (img.complete && img.naturalWidth > 0)
      ? Promise.resolve()
      : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })));
    try { await (document as any).fonts?.ready; } catch { /* fonts optional */ }
    await new Promise((r) => setTimeout(r, 120)); // settle layout/webfonts

    const w = node.offsetWidth || 794;
    const h = node.offsetHeight || 1123;

    const htmlToImage = await import('html-to-image');
    // imagePlaceholder: a referenced asset that fails to load (a partner logo
    // the owner hasn't supplied yet) renders blank instead of rejecting the
    // whole capture. Only affects failed images, so docs whose assets all load
    // are byte-identical to before.
    const pngDataUrl = await htmlToImage.toPng(node, { pixelRatio: opts.pixelRatio || 2, width: w, height: h, backgroundColor: '#ffffff', cacheBust: true, imagePlaceholder: TRANSPARENT_PX });

    const { jsPDF } = await import('jspdf');
    // Page size: the node's own pixel dims in mm (96px = 1 inch), unless the
    // caller forces one (bands are pinned to the print vendor's 254 x 25 mm).
    const mmW = opts.pageFormatMm ? opts.pageFormatMm[0] : (w * 25.4) / 96;
    const mmH = opts.pageFormatMm ? opts.pageFormatMm[1] : (h * 25.4) / 96;
    const pdf = new jsPDF({ orientation: mmW > mmH ? 'landscape' : 'portrait', unit: 'mm', format: [mmW, mmH], compress: true });
    pdf.addImage(pngDataUrl, 'PNG', 0, 0, mmW, mmH);
    const pdfDataUrl = pdf.output('datauristring');
    return { pngDataUrl, pdfDataUrl };
  } finally {
    document.body.removeChild(holder);
  }
}

// ---------------------------------------------------------------------------
// Multi-page rasterisation: an array of filled page HTMLs -> ONE PDF (one page
// per input, each at its own size) + the page-1 PNG (the record's thumbnail).
// Mirrors rasterise()'s mount/wait/snap, then jsPDF.addPage() between pages so
// a 3-page proposal is a single PDF under one serial. Left untouched: the
// single-page rasterise() path the 14 shipped types use.
// ---------------------------------------------------------------------------
// A 1x1 transparent PNG. Used as html-to-image's placeholder so a referenced
// asset that is missing (e.g. the owner-supplied "PPP TV" partner logo on the
// proposal covers) renders BLANK instead of rejecting the whole snapshot -
// exactly the "renders blank until supplied" behaviour the covers expect.
const TRANSPARENT_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function rasteriseMultiPage(pages: string[]): Promise<{ pngDataUrl: string; pdfDataUrl: string }> {
  if (!pages.length) throw new Error('no_pages');
  const htmlToImage = await import('html-to-image');
  const { jsPDF } = await import('jspdf');
  let pdf: any = null;
  let firstPng = '';

  for (let i = 0; i < pages.length; i++) {
    const parsed = new DOMParser().parseFromString(pages[i], 'text/html');
    const page = parsed.querySelector('[data-doc-page]') as HTMLElement | null;
    if (!page) throw new Error('no_doc_page');

    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff;';
    const node = document.importNode(page, true) as HTMLElement;
    holder.appendChild(node);
    document.body.appendChild(holder);

    try {
      const imgs = Array.from(node.querySelectorAll('img'));
      await Promise.all(imgs.map((img) => (img.complete && img.naturalWidth > 0)
        ? Promise.resolve()
        : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })));
      try { await (document as any).fonts?.ready; } catch { /* fonts optional */ }
      await new Promise((r) => setTimeout(r, 120));

      const w = node.offsetWidth || 794;
      const h = node.offsetHeight || 1123;
      const png = await htmlToImage.toPng(node, { pixelRatio: 2, width: w, height: h, backgroundColor: '#ffffff', cacheBust: true, imagePlaceholder: TRANSPARENT_PX });
      if (i === 0) firstPng = png;

      const mmW = (w * 25.4) / 96;
      const mmH = (h * 25.4) / 96;
      const orientation = mmW > mmH ? 'landscape' : 'portrait';
      if (!pdf) pdf = new jsPDF({ orientation, unit: 'mm', format: [mmW, mmH], compress: true });
      else pdf.addPage([mmW, mmH], orientation);
      pdf.addImage(png, 'PNG', 0, 0, mmW, mmH);
    } finally {
      document.body.removeChild(holder);
    }
  }

  return { pngDataUrl: firstPng, pdfDataUrl: pdf.output('datauristring') };
}

// ---------------------------------------------------------------------------
// PROMO rasterisation: filled promo HTML -> a PNG at the exact target social
// size, and (posters only) an A3 PDF. The capture node is the [data-doc-page]
// card (a fixed design px, e.g. 560x560); pixelRatio = targetWidth / cardWidth
// hits the target pixel width exactly (a square card -> exactly 1080x1080). A
// referenced brand image the owner has not supplied yet renders BLANK
// (imagePlaceholder) instead of failing the whole capture - the "renders blank
// until dropped into public/uploads" behaviour the promo pieces expect.
// ---------------------------------------------------------------------------
async function rasterisePromo(
  html: string,
  target: [number, number],
  wantPdf: boolean
): Promise<{ pngDataUrl: string; pdfDataUrl?: string }> {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const page = parsed.querySelector('[data-doc-page]') as HTMLElement | null;
  if (!page) throw new Error('no_doc_page');

  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff;';
  const node = document.importNode(page, true) as HTMLElement;
  holder.appendChild(node);
  document.body.appendChild(holder);

  try {
    const imgs = Array.from(node.querySelectorAll('img'));
    await Promise.all(imgs.map((img) => (img.complete && img.naturalWidth > 0)
      ? Promise.resolve()
      : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })));
    try { await (document as any).fonts?.ready; } catch { /* fonts optional */ }
    await new Promise((r) => setTimeout(r, 150)); // settle layout/webfonts

    const w = node.offsetWidth || target[0];
    const h = node.offsetHeight || target[1];
    const ratio = target[0] / w; // exact target width; height follows the card aspect

    const htmlToImage = await import('html-to-image');
    const pngDataUrl = await htmlToImage.toPng(node, {
      pixelRatio: ratio, width: w, height: h, backgroundColor: '#ffffff',
      cacheBust: true, imagePlaceholder: TRANSPARENT_PX,
    });

    let pdfDataUrl: string | undefined;
    if (wantPdf) {
      const { jsPDF } = await import('jspdf');
      // A3 portrait (297 x 420 mm); the poster image fills the page.
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a3', compress: true });
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, 297, 420);
      pdfDataUrl = pdf.output('datauristring');
    }
    return { pngDataUrl, pdfDataUrl };
  } finally {
    document.body.removeChild(holder);
  }
}

// ---------------------------------------------------------------------------
// CSV parsing (RFC4180-ish, dependency-free): handles a header row, quoted
// fields with embedded commas/newlines, doubled "" escapes, and trailing
// blank lines.
// ---------------------------------------------------------------------------
function parseCsv(text: string): string[][] {
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); out.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); out.push(row); }
  // drop fully-empty rows (trailing newlines / blank separators)
  return out.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// Map a CSV matrix to field objects. If the first row names any known field,
// it is treated as a header and columns are mapped by name; otherwise columns
// are taken positionally in the schema's field order.
function rowsToObjects(type: 'certw' | 'certp', matrix: string[][]): Record<string, string>[] {
  const fields = CSV_FIELDS[type];
  if (matrix.length === 0) return [];
  const known = fields.map((f) => f.toLowerCase());
  const first = matrix[0].map((c) => c.trim());
  const hasHeader = first.some((c) => known.includes(c.toLowerCase()));
  const colToField: (string | null)[] = hasHeader
    ? first.map((c) => { const idx = known.indexOf(c.toLowerCase()); return idx >= 0 ? fields[idx] : null; })
    : fields.map((f) => f);
  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  return dataRows.map((cells) => {
    const obj: Record<string, string> = {};
    for (const f of fields) obj[f] = '';
    if (hasHeader) {
      cells.forEach((v, i) => { const f = colToField[i]; if (f) obj[f] = String(v).trim(); });
    } else {
      fields.forEach((f, i) => { obj[f] = String(cells[i] || '').trim(); });
    }
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Client-side ZIP (STORE method, no external dep). PDFs are already
// compressed, so storing avoids shipping a deflate implementation. Produces a
// standard PK\x03\x04 archive; mirrors the server buildZip() byte layout.
// ---------------------------------------------------------------------------
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const idx = dataUrl.indexOf('base64,');
  const b64 = idx >= 0 ? dataUrl.slice(idx + 7) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Serial-list CSV manifest for a quantity batch - the gate / box office / print
// vendor's copy of every serial issued in this run and where each one verifies.
function buildSerialCsv(type: DocType, serials: string[], shared: Record<string, any>): string {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  let cols: string[];
  let rowFor: (s: string) => (string | number)[];
  if (type === 'tix') {
    cols = ['serial', 'tier', 'event', 'venue', 'date', 'verify'];
    rowFor = (s) => [s, shared.tier || 'GA', shared.eventName || '', shared.venue || '', shared.date || '', VERIFY_BASE + s];
  } else if (type === 'spass') {
    cols = ['serial', 'school', 'event', 'date', 'verify'];
    rowFor = (s) => [s, shared.schoolName || '', shared.eventName || '', shared.date || '', VERIFY_BASE + s];
  } else {
    cols = ['serial', 'bandType', 'event', 'school', 'date', 'verify'];
    rowFor = (s) => [s, shared.bandType || 'GA', shared.eventName || '', shared.schoolName || '', shared.date || '', VERIFY_BASE + s];
  }
  return [cols.join(','), ...serials.map((s) => rowFor(s).map(esc).join(','))].join('\n');
}

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    crcTable = t;
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const now = new Date();
  const time = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() >> 1) & 0x1f);
  const date = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0xf) << 5) | (now.getDate() & 0x1f);
  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;

  for (const f of files) {
    const nameBuf = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // bit 11: UTF-8 filenames
    local.setUint16(8, 0, true); // method 0 = store
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBuf.length, true);
    local.setUint16(28, 0, true);
    parts.push(local.buffer, nameBuf, data);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, time, true);
    cen.setUint16(14, date, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, nameBuf.length, true);
    cen.setUint32(42, offset, true);
    central.push(cen.buffer, nameBuf);

    offset += 30 + nameBuf.length + data.length;
    centralSize += 46 + nameBuf.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

// ---------------------------------------------------------------------------
// Sandboxed, auto-scaled preview iframe.
// ---------------------------------------------------------------------------
function Preview({ html, docType }: { html: string; docType: DocType }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const dims = DIMS[docType];
  const frameW = dims.w + 68; // body padding 34 each side
  const frameH = dims.h + 68;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setScale(Math.min(1, w / frameW));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [frameW]);

  return (
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden' }}>
      <div style={{ width: frameW * scale, height: frameH * scale, position: 'relative' }}>
        {html
          ? <iframe
              title="preview"
              sandbox="allow-same-origin"
              srcDoc={html}
              style={{ width: frameW, height: frameH, border: '1px solid #eee', borderRadius: 8, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}
            />
          : <div style={{ padding: 24, color: '#999', fontSize: 13 }}>Fill the form to see a live preview.</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
function Field({ lbl, children }: { lbl: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}><label style={label}>{lbl}</label>{children}</div>;
}

function InvoiceForm({ inv, setInv, rows, setRows, computed }: any) {
  const set = (k: string) => (e: any) => setInv({ ...inv, [k]: e.target.value });
  const setRow = (i: number, k: keyof LineRow) => (e: any) => {
    const next = rows.slice(); next[i] = { ...next[i], [k]: e.target.value }; setRows(next);
  };
  const addRow = () => { if (rows.length < 7) setRows([...rows, emptyRow()]); };
  const delRow = (i: number) => setRows(rows.length > 1 ? rows.filter((_: any, j: number) => j !== i) : rows);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Date"><input type="date" style={inp} value={inv.date} onChange={set('date')} /></Field>
        <Field lbl="Due date"><input type="date" style={inp} value={inv.dueDate} onChange={set('dueDate')} /></Field>
      </div>
      <Field lbl="Bill to"><input style={inp} value={inv.billTo} onChange={set('billTo')} placeholder="Client / school name" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="P.O. (if any)"><input style={inp} value={inv.poNumber} onChange={set('poNumber')} /></Field>
        <Field lbl="Event / project"><input style={inp} value={inv.eventProject} onChange={set('eventProject')} /></Field>
      </div>

      <label style={label}>Line items (max 7)</label>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        {rows.map((r: LineRow, i: number) => {
          const amt = num(r.qty) * num(r.rate);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 84px 84px 28px', gap: 6, alignItems: 'center' }}>
              <input style={{ ...inp, padding: '7px 9px' }} placeholder="Description" value={r.description} onChange={setRow(i, 'description')} />
              <input style={{ ...inp, padding: '7px 9px' }} type="number" min={0} placeholder="Qty" value={r.qty} onChange={setRow(i, 'qty')} />
              <input style={{ ...inp, padding: '7px 9px' }} type="number" min={0} placeholder="Rate" value={r.rate} onChange={setRow(i, 'rate')} />
              <div style={{ fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#555' }}>{amt ? fmtKsh(amt) : '-'}</div>
              <button onClick={() => delRow(i)} title="Remove" style={{ ...btnSmall, background: '#eee', padding: '5px 7px' }}>x</button>
            </div>
          );
        })}
      </div>
      <button onClick={addRow} disabled={rows.length >= 7} style={{ ...btnSmall, opacity: rows.length >= 7 ? 0.5 : 1 }}>+ Add line</button>

      <Field lbl="Discount (KSH)"><input style={inp} type="number" min={0} value={inv.discount} onChange={set('discount')} placeholder="0" /></Field>

      <div style={{ background: '#faf7f0', border: '2px solid #111', borderRadius: 10, padding: 10, margin: '4px 0 10px', fontSize: 13 }}>
        <Line k="Subtotal" v={'KSH ' + fmtKsh(computed?.subtotal || 0)} />
        <Line k="Discount" v={'KSH ' + fmtKsh(computed?.discount || 0)} />
        <Line k="Total" v={'KSH ' + fmtKsh(computed?.total || 0)} bold />
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Computed by the server - authoritative.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="M-PESA Till / Paybill"><input style={inp} value={inv.mpesaTill} onChange={set('mpesaTill')} /></Field>
        <Field lbl="Account name"><input style={inp} value={inv.accountName} onChange={set('accountName')} /></Field>
      </div>
      <Field lbl="Bank / branch / acc no."><input style={inp} value={inv.bankDetails} onChange={set('bankDetails')} /></Field>
    </div>
  );
}

function ReceiptForm({ rct, setRct, computed }: any) {
  const set = (k: string) => (e: any) => setRct({ ...rct, [k]: e.target.value });
  const methods = ['M-PESA', 'Bank', 'Cash'];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Date"><input type="date" style={inp} value={rct.date} onChange={set('date')} /></Field>
        <Field lbl="Received from"><input style={inp} value={rct.receivedFrom} onChange={set('receivedFrom')} placeholder="Payer name" /></Field>
      </div>
      <Field lbl="Amount (KSH figures)"><input style={inp} type="number" min={0} value={rct.amountFigures} onChange={set('amountFigures')} placeholder="Amount in KSH" /></Field>
      <div style={{ background: '#faf7f0', border: '2px solid #111', borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 13 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>Amount in words (auto)</div>
        <div style={{ fontWeight: 700, marginTop: 3 }}>{computed?.amountWords || '-'}</div>
      </div>
      <Field lbl="Being payment for"><input style={inp} value={rct.beingPaymentFor} onChange={set('beingPaymentFor')} placeholder="What this payment is for" /></Field>
      <label style={label}>Method</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {methods.map((m) => (
          <button key={m} onClick={() => setRct({ ...rct, method: m })}
            style={{ ...btnSmall, background: rct.method === m ? '#E6218C' : '#fff', color: rct.method === m ? '#fff' : '#111' }}>{m}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Transaction ref"><input style={inp} value={rct.transactionRef} onChange={set('transactionRef')} /></Field>
        <Field lbl="Balance due (if any)"><input style={inp} type="number" min={0} value={rct.balanceDue} onChange={set('balanceDue')} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Invoice no. (if any)"><input style={inp} value={rct.invoiceNo} onChange={set('invoiceNo')} /></Field>
        <Field lbl="Received by"><input style={inp} value={rct.receivedBy} onChange={set('receivedBy')} /></Field>
      </div>
    </div>
  );
}

function CertWForm({ cw, setCw }: any) {
  const set = (k: string) => (e: any) => setCw({ ...cw, [k]: e.target.value });
  return (
    <div>
      <Field lbl="Recipient name (required)"><input style={inp} value={cw.recipientName} onChange={set('recipientName')} placeholder="Winner's full name" /></Field>
      <Field lbl="Category / award"><input style={inp} value={cw.category} onChange={set('category')} placeholder="e.g. Best Dance Crew" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Stop / venue"><input style={inp} value={cw.stopName} onChange={set('stopName')} placeholder="e.g. Nairobi" /></Field>
        <Field lbl="Event date"><input type="date" style={inp} value={cw.eventDate} onChange={set('eventDate')} /></Field>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        Certificate number is issued automatically (CERTW serial). To make many at once, switch to Batch from CSV.
      </div>
    </div>
  );
}

function CertPForm({ cp, setCp }: any) {
  const set = (k: string) => (e: any) => setCp({ ...cp, [k]: e.target.value });
  return (
    <div>
      <Field lbl="Participant name (required)"><input style={inp} value={cp.participantName} onChange={set('participantName')} placeholder="Participant's full name" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Pod / group"><input style={inp} value={cp.podName} onChange={set('podName')} placeholder="e.g. Rap Pod" /></Field>
        <Field lbl="Stop / venue"><input style={inp} value={cp.stopName} onChange={set('stopName')} placeholder="e.g. Kisumu" /></Field>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        Certificate number is issued automatically (CERTP serial). To make many at once, switch to Batch from CSV.
      </div>
    </div>
  );
}

function CallSheetForm({ call, setCall, crew, setCrew, ros, setRos, dontForget, setDontForget }: any) {
  const set = (k: string) => (e: any) => setCall({ ...call, [k]: e.target.value });

  const setCrewRow = (i: number, k: keyof CrewRow) => (e: any) => {
    const next = crew.slice(); next[i] = { ...next[i], [k]: e.target.value }; setCrew(next);
  };
  const addCrew = () => { if (crew.length < 24) setCrew([...crew, emptyCrew()]); };
  const delCrew = (i: number) => setCrew(crew.length > 1 ? crew.filter((_: any, j: number) => j !== i) : crew);

  const setRosRow = (i: number, k: keyof RosRow) => (e: any) => {
    const next = ros.slice(); next[i] = { ...next[i], [k]: e.target.value }; setRos(next);
  };
  const addRos = () => { if (ros.length < 20) setRos([...ros, emptyRos()]); };
  const delRos = (i: number) => setRos(ros.length > 1 ? ros.filter((_: any, j: number) => j !== i) : ros);

  const setDf = (i: number) => (e: any) => {
    const next = dontForget.slice(); next[i] = e.target.value; setDontForget(next);
  };
  const addDf = () => { if (dontForget.length < 8) setDontForget([...dontForget, '']); };
  const delDf = (i: number) => setDontForget(dontForget.length > 1 ? dontForget.filter((_: any, j: number) => j !== i) : dontForget);

  return (
    <div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
        Pre-filled with the real Lari Boys example. Edit it, or clear the fields and enter your own event.
      </div>
      <Field lbl="Event / school (issued to)"><input style={inp} value={call.eventName} onChange={set('eventName')} placeholder="e.g. Lari Boys High School" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Field lbl="Date"><input style={inp} value={call.date} onChange={set('date')} placeholder="e.g. Sun 19 Jul" /></Field>
        <Field lbl="Venue"><input style={inp} value={call.venue} onChange={set('venue')} placeholder="e.g. Kimende" /></Field>
        <Field lbl="Crew call"><input style={inp} value={call.crewCall} onChange={set('crewCall')} placeholder="e.g. 5:00 AM" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Field lbl="Flat day rate"><input style={inp} value={call.dayRate} onChange={set('dayRate')} placeholder="e.g. KSH 1,000" /></Field>
        <Field lbl="Director"><input style={inp} value={call.director} onChange={set('director')} placeholder="Chain of command" /></Field>
        <Field lbl="Stage manager"><input style={inp} value={call.stageManager} onChange={set('stageManager')} /></Field>
      </div>

      <label style={label}>Crew ({crew.length} / 24)</label>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        {crew.map((r: CrewRow, i: number) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: 6, alignItems: 'center' }}>
            <input style={{ ...inp, padding: '7px 9px' }} placeholder="Name" value={r.name} onChange={setCrewRow(i, 'name')} />
            <input style={{ ...inp, padding: '7px 9px' }} placeholder="Role" value={r.role} onChange={setCrewRow(i, 'role')} />
            <button onClick={() => delCrew(i)} title="Remove" style={{ ...btnSmall, background: '#eee', padding: '5px 7px' }}>x</button>
          </div>
        ))}
      </div>
      <button onClick={addCrew} disabled={crew.length >= 24} style={{ ...btnSmall, opacity: crew.length >= 24 ? 0.5 : 1 }}>+ Add crew</button>

      <label style={{ ...label, marginTop: 14 }}>Run of show ({ros.length} / 20)</label>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        {ros.map((r: RosRow, i: number) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '58px 1fr 1fr 28px', gap: 6, alignItems: 'center' }}>
            <input style={{ ...inp, padding: '7px 6px' }} placeholder="Time" value={r.time} onChange={setRosRow(i, 'time')} />
            <input style={{ ...inp, padding: '7px 9px' }} placeholder="Segment" value={r.segment} onChange={setRosRow(i, 'segment')} />
            <input style={{ ...inp, padding: '7px 9px' }} placeholder="Notes" value={r.notes} onChange={setRosRow(i, 'notes')} />
            <button onClick={() => delRos(i)} title="Remove" style={{ ...btnSmall, background: '#eee', padding: '5px 7px' }}>x</button>
          </div>
        ))}
      </div>
      <button onClick={addRos} disabled={ros.length >= 20} style={{ ...btnSmall, opacity: ros.length >= 20 ? 0.5 : 1 }}>+ Add run-of-show row</button>

      <label style={{ ...label, marginTop: 14 }}>Don't forget ({dontForget.length} / 8)</label>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        {dontForget.map((v: string, i: number) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 28px', gap: 6, alignItems: 'center' }}>
            <input style={{ ...inp, padding: '7px 9px' }} placeholder="Reminder" value={v} onChange={setDf(i)} />
            <button onClick={() => delDf(i)} title="Remove" style={{ ...btnSmall, background: '#eee', padding: '5px 7px' }}>x</button>
          </div>
        ))}
      </div>
      <button onClick={addDf} disabled={dontForget.length >= 8} style={{ ...btnSmall, opacity: dontForget.length >= 8 ? 0.5 : 1 }}>+ Add reminder</button>
    </div>
  );
}

function BudgetForm({ bud, setBud, moneyIn, setMoneyIn, moneyOut, setMoneyOut, computed }: any) {
  const set = (k: string) => (e: any) => setBud({ ...bud, [k]: e.target.value });

  const setIn = (i: number, k: keyof InRow) => (e: any) => {
    const next = moneyIn.slice(); next[i] = { ...next[i], [k]: e.target.value }; setMoneyIn(next);
  };
  const addIn = () => { if (moneyIn.length < 5) setMoneyIn([...moneyIn, emptyIn()]); };
  const delIn = (i: number) => setMoneyIn(moneyIn.length > 1 ? moneyIn.filter((_: any, j: number) => j !== i) : moneyIn);

  const setOut = (i: number, k: keyof OutRow) => (e: any) => {
    const next = moneyOut.slice(); next[i] = { ...next[i], [k]: e.target.value }; setMoneyOut(next);
  };
  const addOut = () => { if (moneyOut.length < 11) setMoneyOut([...moneyOut, emptyOut()]); };
  const delOut = (i: number) => setMoneyOut(moneyOut.length > 1 ? moneyOut.filter((_: any, j: number) => j !== i) : moneyOut);

  return (
    <div>
      <Field lbl="Event / school (issued to)"><input style={inp} value={bud.eventName} onChange={set('eventName')} placeholder="Event or school name" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Date"><input type="date" style={inp} value={bud.date} onChange={set('date')} /></Field>
        <Field lbl="Prepared by"><input style={inp} value={bud.preparedBy} onChange={set('preparedBy')} /></Field>
      </div>

      <label style={label}>Money in ({moneyIn.length} / 5) - amount = count x rate (server-computed)</label>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        {moneyIn.map((r: InRow, i: number) => {
          const amt = num(r.count) * num(r.rate);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 84px 84px 28px', gap: 6, alignItems: 'center' }}>
              <input style={{ ...inp, padding: '7px 9px' }} placeholder="Source" value={r.source} onChange={setIn(i, 'source')} />
              <input style={{ ...inp, padding: '7px 6px' }} type="number" min={0} placeholder="Count" value={r.count} onChange={setIn(i, 'count')} />
              <input style={{ ...inp, padding: '7px 9px' }} type="number" min={0} placeholder="Rate" value={r.rate} onChange={setIn(i, 'rate')} />
              <div style={{ fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#555' }}>{amt ? fmtKsh(amt) : '-'}</div>
              <button onClick={() => delIn(i)} title="Remove" style={{ ...btnSmall, background: '#eee', padding: '5px 7px' }}>x</button>
            </div>
          );
        })}
      </div>
      <button onClick={addIn} disabled={moneyIn.length >= 5} style={{ ...btnSmall, opacity: moneyIn.length >= 5 ? 0.5 : 1 }}>+ Add income line</button>

      <label style={{ ...label, marginTop: 14 }}>Money out ({moneyOut.length} / 11)</label>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        {moneyOut.map((r: OutRow, i: number) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 84px 28px', gap: 6, alignItems: 'center' }}>
            <input style={{ ...inp, padding: '7px 9px' }} placeholder="Line item" value={r.item} onChange={setOut(i, 'item')} />
            <input style={{ ...inp, padding: '7px 9px' }} placeholder="Supplier" value={r.supplier} onChange={setOut(i, 'supplier')} />
            <input style={{ ...inp, padding: '7px 9px' }} type="number" min={0} placeholder="Amount" value={r.amount} onChange={setOut(i, 'amount')} />
            <button onClick={() => delOut(i)} title="Remove" style={{ ...btnSmall, background: '#eee', padding: '5px 7px' }}>x</button>
          </div>
        ))}
      </div>
      <button onClick={addOut} disabled={moneyOut.length >= 11} style={{ ...btnSmall, opacity: moneyOut.length >= 11 ? 0.5 : 1 }}>+ Add expense line</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
        <Field lbl="Savings transfer (%)"><input style={inp} type="number" min={0} max={100} value={bud.savingsPercent} onChange={set('savingsPercent')} placeholder="e.g. 30" /></Field>
        <Field lbl="Crew headcount (check)"><input style={inp} type="number" min={0} value={bud.crewCount} onChange={set('crewCount')} placeholder="optional" /></Field>
        <Field lbl="Crew rate (check)"><input style={inp} type="number" min={0} value={bud.crewRate} onChange={set('crewRate')} placeholder="optional" /></Field>
      </div>

      <div style={{ background: '#faf7f0', border: '2px solid #111', borderRadius: 10, padding: 10, margin: '4px 0 4px', fontSize: 13 }}>
        <Line k="Total in" v={'KSH ' + fmtKsh(computed?.totalIn || 0)} />
        <Line k="Total out" v={'KSH ' + fmtKsh(computed?.totalOut || 0)} />
        <Line k="Profit (in less out)" v={'KSH ' + fmtKsh(computed?.profit || 0)} bold />
        <Line k={'Savings (' + (computed?.savingsPercent ?? 0) + '%)'} v={'KSH ' + fmtKsh(computed?.savings || 0)} />
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Computed by the server - authoritative. Typed totals are ignored.</div>
      </div>
      {computed?.crewWarning && (
        <div style={{ background: '#fff8e6', border: '2px solid #E0A800', borderRadius: 10, padding: 10, fontSize: 12.5, color: '#7a5c00', fontWeight: 600 }}>
          Heads up: {computed.crewWarning}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event ticket form. Batch by quantity. schoolStop locks the tier to GA (the
// single-tier school rule); VIP is disabled and the server also rejects any
// VIP + schoolStop request, so a school ticket can never be VIP.
// ---------------------------------------------------------------------------
function TicketForm({ tix, setTix }: any) {
  const set = (k: string) => (e: any) => setTix({ ...tix, [k]: e.target.value });
  const toggleSchool = (e: any) => {
    const on = e.target.checked;
    setTix({ ...tix, schoolStop: on, tier: on ? 'GA' : tix.tier });
  };
  const effTier = tix.schoolStop ? 'GA' : tix.tier;
  return (
    <div>
      <Field lbl="Event name (required)"><input style={inp} value={tix.eventName} onChange={set('eventName')} placeholder="e.g. Campus Rave Nairobi" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Field lbl="Date"><input style={inp} value={tix.date} onChange={set('date')} placeholder="e.g. FRI 3 OCT" /></Field>
        <Field lbl="Venue"><input style={inp} value={tix.venue} onChange={set('venue')} placeholder="e.g. Carnivore Grounds" /></Field>
        <Field lbl="Gate time"><input style={inp} value={tix.gateTime} onChange={set('gateTime')} placeholder="e.g. GATES 4 PM" /></Field>
      </div>
      <label style={label}>Tier</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['GA', 'VIP'].map((t) => {
          const locked = tix.schoolStop && t === 'VIP';
          const active = effTier === t;
          return (
            <button key={t} disabled={locked} onClick={() => !locked && setTix({ ...tix, tier: t })}
              style={{ ...btnSmall, background: active ? '#E6218C' : '#fff', color: active ? '#fff' : '#111', opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
              {t}{locked ? ' (locked)' : ''}
            </button>
          );
        })}
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        <input type="checkbox" checked={tix.schoolStop} onChange={toggleSchool} />
        School stop (single-tier only)
      </label>
      <div style={{ fontSize: 11, color: '#999' }}>
        School stops are GA-only by rule. VIP is locked here, and the server rejects any VIP request for a school stop.
        GA prints in the magenta scheme; VIP is the gold-on-black design.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student pass form (inherently a school / single-tier pass). Batch by quantity.
// ---------------------------------------------------------------------------
function StudentPassForm({ spass, setSpass }: any) {
  const set = (k: string) => (e: any) => setSpass({ ...spass, [k]: e.target.value });
  return (
    <div>
      <Field lbl="Event name (required)"><input style={inp} value={spass.eventName} onChange={set('eventName')} placeholder="e.g. Urban Gang Tour school stop" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="School name"><input style={inp} value={spass.schoolName} onChange={set('schoolName')} placeholder="e.g. Lari Boys High School" /></Field>
        <Field lbl="Date"><input style={inp} value={spass.date} onChange={set('date')} placeholder="e.g. Sun 19 Jul" /></Field>
      </div>
      <div style={{ fontSize: 11, color: '#999' }}>Single-tier by design. No VIP, no VVIP. Front is the pass, back is the Gang Hunt card.</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wristband form. bandType picks the artwork: GA / VIP / Crew are event bands
// (tier only); Student is the school band (school + date). Batch by quantity;
// prints at 254 x 25 mm.
// ---------------------------------------------------------------------------
function BandForm({ band, setBand }: any) {
  const set = (k: string) => (e: any) => setBand({ ...band, [k]: e.target.value });
  const isStudent = band.bandType === 'Student';
  return (
    <div>
      <label style={label}>Band type</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {['GA', 'VIP', 'Crew', 'Student'].map((t) => (
          <button key={t} onClick={() => setBand({ ...band, bandType: t })}
            style={{ ...btnSmall, background: band.bandType === t ? '#E6218C' : '#fff', color: band.bandType === t ? '#fff' : '#111' }}>{t}</button>
        ))}
      </div>
      <Field lbl="Event name (optional, for your records)"><input style={inp} value={band.eventName} onChange={set('eventName')} placeholder="e.g. Campus Rave Nairobi" /></Field>
      {isStudent && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field lbl="School name"><input style={inp} value={band.schoolName} onChange={set('schoolName')} placeholder="School printed on the band" /></Field>
          <Field lbl="Date"><input style={inp} value={band.date} onChange={set('date')} placeholder="e.g. Sun 19 Jul" /></Field>
        </div>
      )}
      <div style={{ fontSize: 11, color: '#999' }}>
        {isStudent
          ? 'Student band is the school / single-tier band (school name + date printed).'
          : 'Event bands carry the tier only. Output is print-vendor artwork at 254 x 25 mm plus a serial CSV.'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thank-you letter to a host school. Simple text fills.
// ---------------------------------------------------------------------------
function LetterForm({ ltr, setLtr }: any) {
  const set = (k: string) => (e: any) => setLtr({ ...ltr, [k]: e.target.value });
  return (
    <div>
      <Field lbl="School name (required)"><input style={inp} value={ltr.schoolName} onChange={set('schoolName')} placeholder="e.g. Lari Boys High School" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Dear... (salutation)"><input style={inp} value={ltr.principalSalutation} onChange={set('principalSalutation')} placeholder="e.g. Dr. Kamau / Madam Principal" /></Field>
        <Field lbl="Date"><input type="date" style={inp} value={ltr.date} onChange={set('date')} /></Field>
      </div>
      <Field lbl="Winner name(s)"><input style={inp} value={ltr.winnerNames} onChange={set('winnerNames')} placeholder="e.g. Mary Wanjiku & the Dance Crew" /></Field>
      <Field lbl="Winner category / award"><input style={inp} value={ltr.winnerCategory} onChange={set('winnerCategory')} placeholder="e.g. Best Dance Crew" /></Field>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        Letter number is issued automatically (LTR serial) and printed as a verify QR in the corner.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Media accreditation. coveringAs is a multi-select rendered as ticked chips
// on the form. badgeNo is the auto serial; approvedBy is office use.
// ---------------------------------------------------------------------------
const COVER_OPTS: { key: string; label: string }[] = [
  { key: 'PHOTO', label: 'Photo' },
  { key: 'VIDEO', label: 'Video' },
  { key: 'PRINT', label: 'Print / Online' },
  { key: 'RADIO', label: 'Radio / Podcast' },
  { key: 'CREATOR', label: 'Content Creator' },
];
function AccreditationForm({ acc, setAcc }: any) {
  const set = (k: string) => (e: any) => setAcc({ ...acc, [k]: e.target.value });
  const toggle = (k: string) => {
    const cur: string[] = acc.coveringAs || [];
    setAcc({ ...acc, coveringAs: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] });
  };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Full name (required)"><input style={inp} value={acc.fullName} onChange={set('fullName')} placeholder="Applicant's full name" /></Field>
        <Field lbl="National ID / Passport"><input style={inp} value={acc.idNumber} onChange={set('idNumber')} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Outlet / Channel"><input style={inp} value={acc.outlet} onChange={set('outlet')} placeholder="e.g. PPP TV" /></Field>
        <Field lbl="Handle"><input style={inp} value={acc.handle} onChange={set('handle')} placeholder="@handle" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Phone"><input style={inp} value={acc.phone} onChange={set('phone')} /></Field>
        <Field lbl="Email"><input style={inp} value={acc.email} onChange={set('email')} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Event / Stop"><input style={inp} value={acc.event} onChange={set('event')} placeholder="e.g. Campus Rave Nairobi" /></Field>
        <Field lbl="Date"><input type="date" style={inp} value={acc.date} onChange={set('date')} /></Field>
      </div>
      <label style={label}>Covering as (tick all that apply)</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {COVER_OPTS.map((o) => {
          const on = (acc.coveringAs || []).includes(o.key);
          return (
            <button key={o.key} onClick={() => toggle(o.key)}
              style={{ ...btnSmall, background: on ? '#111' : '#fff', color: on ? '#fff' : '#111' }}>
              {on ? '✓ ' : ''}{o.label}
            </button>
          );
        })}
      </div>
      <Field lbl="Equipment carried"><input style={inp} value={acc.equipment} onChange={set('equipment')} placeholder="cameras, drones, rigs" /></Field>
      <Field lbl="Approved by (office use)"><input style={inp} value={acc.approvedBy} onChange={set('approvedBy')} placeholder="Leave blank to sign by hand" /></Field>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        Badge Nº is the auto serial (ACC). Ticked chips print as filled boxes on the form.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gate / vehicle pass. zone is a single-select enum that ticks + highlights
// the matching chip on the pass; carries a QR (verify).
// ---------------------------------------------------------------------------
const ZONE_OPTS = ['Stage', 'Media', 'VIP', 'Vendor'];
function GatePassForm({ pass, setPass }: any) {
  const set = (k: string) => (e: any) => setPass({ ...pass, [k]: e.target.value });
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Vehicle reg (required)"><input style={inp} value={pass.vehicleReg} onChange={set('vehicleReg')} placeholder="e.g. KDA 123A" /></Field>
        <Field lbl="Driver"><input style={inp} value={pass.driver} onChange={set('driver')} placeholder="Driver name" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Event / Stop"><input style={inp} value={pass.event} onChange={set('event')} placeholder="e.g. Campus Rave Nairobi" /></Field>
        <Field lbl="Date"><input type="date" style={inp} value={pass.date} onChange={set('date')} /></Field>
      </div>
      <label style={label}>Zone</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {ZONE_OPTS.map((z) => (
          <button key={z} onClick={() => setPass({ ...pass, zone: z })}
            style={{ ...btnSmall, background: pass.zone === z ? '#E6218C' : '#fff', color: pass.zone === z ? '#fff' : '#111' }}>{z}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#999' }}>
        The selected zone chip is ticked and highlighted on the pass; the others fade back. Pass Nº is the auto serial (PASS).
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Talent media release. Under-18 talent MUST have the full guardian block or
// the server rejects it (fail closed). linkedCertSerial is an optional soft
// link to a winner/participation certificate.
// ---------------------------------------------------------------------------
function ReleaseForm({ rel, setRel, computed }: any) {
  const set = (k: string) => (e: any) => setRel({ ...rel, [k]: e.target.value });
  const ageNum = rel.age === '' ? null : Number(rel.age);
  const isMinor = ageNum !== null && Number.isFinite(ageNum) && ageNum < 18;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
        <Field lbl="Talent name (required)"><input style={inp} value={rel.talentName} onChange={set('talentName')} placeholder="Talent's full name" /></Field>
        <Field lbl="Age (required)"><input style={inp} type="number" min={0} value={rel.age} onChange={set('age')} placeholder="e.g. 16" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="School / Institution"><input style={inp} value={rel.school} onChange={set('school')} /></Field>
        <Field lbl="Category performed"><input style={inp} value={rel.category} onChange={set('category')} placeholder="e.g. Spoken Word" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Event / Stop"><input style={inp} value={rel.event} onChange={set('event')} /></Field>
        <Field lbl="Date"><input type="date" style={inp} value={rel.date} onChange={set('date')} /></Field>
      </div>

      <div style={{
        border: `2px ${isMinor ? 'solid #C62828' : 'dashed #b9a08a'}`, borderRadius: 10, padding: 10,
        margin: '4px 0 10px', background: isMinor ? '#fff5f5' : '#faf7f0',
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, color: isMinor ? '#C62828' : '#555' }}>
          Guardian / teacher consent {isMinor ? '(REQUIRED - talent is under 18)' : '(only if talent is under 18)'}
        </div>
        <Field lbl="Guardian name"><input style={inp} value={rel.guardianName} onChange={set('guardianName')} placeholder={isMinor ? 'Required' : 'optional'} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field lbl="Relationship"><input style={inp} value={rel.relationship} onChange={set('relationship')} placeholder={isMinor ? 'Required' : 'optional'} /></Field>
          <Field lbl="Guardian phone"><input style={inp} value={rel.phone} onChange={set('phone')} placeholder={isMinor ? 'Required' : 'optional'} /></Field>
        </div>
        {isMinor && (
          <div style={{ fontSize: 11.5, color: '#C62828', fontWeight: 600 }}>
            Under 18: the release cannot be issued without all three guardian fields. The server rejects it.
          </div>
        )}
      </div>

      <Field lbl="Link to certificate Nº (optional)"><input style={inp} value={rel.linkedCertSerial} onChange={set('linkedCertSerial')} placeholder="e.g. UGT-CERTW-26-0001" /></Field>
      {computed?.linkWarning && (
        <div style={{ background: '#fff8e6', border: '2px solid #E0A800', borderRadius: 10, padding: 10, fontSize: 12.5, color: '#7a5c00', fontWeight: 600 }}>
          Heads up: {computed.linkWarning}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parental consent letter. Signed BY THE SCHOOL - the generator only pre-fills
// the school-specific blanks; the stamp/signatures stay physical and there is
// NO verify QR. It still gets a CONS serial for the record.
// ---------------------------------------------------------------------------
function ConsentForm({ cons, setCons }: any) {
  const set = (k: string) => (e: any) => setCons({ ...cons, [k]: e.target.value });
  return (
    <div>
      <Field lbl="School name (required)"><input style={inp} value={cons.schoolName} onChange={set('schoolName')} placeholder="Host school name" /></Field>
      <Field lbl="P.O. Box / Address"><input style={inp} value={cons.schoolAddress} onChange={set('schoolAddress')} placeholder="School postal address" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Event date"><input type="date" style={inp} value={cons.eventDate} onChange={set('eventDate')} /></Field>
        <Field lbl="Return slip by"><input type="date" style={inp} value={cons.returnByDate} onChange={set('returnByDate')} /></Field>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        This letter is signed and stamped BY THE SCHOOL. The generator only pre-fills these blanks; the principal's signature and school stamp stay physical, and there is no verify QR. A CONS serial is still recorded.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partnership proposal (3 pages, ONE PROP serial). Only the cover carries these
// blanks; the pitch + package pages are fixed content. The verify QR prints on
// the cover, and all three pages rasterise into one PDF.
// ---------------------------------------------------------------------------
function ProposalForm({ prop, setProp }: any) {
  const set = (k: string) => (e: any) => setProp({ ...prop, [k]: e.target.value });
  return (
    <div>
      <Field lbl="Prepared for (required)"><input style={inp} value={prop.preparedFor} onChange={set('preparedFor')} placeholder="Partner / company name" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Prepared by"><input style={inp} value={prop.preparedBy} onChange={set('preparedBy')} placeholder="e.g. The Gang / your name" /></Field>
        <Field lbl="Date"><input type="date" style={inp} value={prop.date} onChange={set('date')} /></Field>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        Three pages: cover (these details), the pitch, and the packages. One PROP serial; the verify QR prints on the cover. Preview shows page 1; Generate makes a single 3-page PDF.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// School proposal (3 pages, ONE SPROP serial). Page 3 stays negotiation-framed
// by design: there is NO price field here and none is ever printed.
// ---------------------------------------------------------------------------
function SchoolProposalForm({ sprop, setSprop }: any) {
  const set = (k: string) => (e: any) => setSprop({ ...sprop, [k]: e.target.value });
  return (
    <div>
      <Field lbl="School name (required)"><input style={inp} value={sprop.schoolName} onChange={set('schoolName')} placeholder="Host school name" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Attention (Dear...)"><input style={inp} value={sprop.attention} onChange={set('attention')} placeholder="e.g. The Principal" /></Field>
        <Field lbl="Date"><input type="date" style={inp} value={sprop.date} onChange={set('date')} /></Field>
      </div>
      <Field lbl="Proposed event date (optional, for your records)"><input style={inp} value={sprop.eventDate} onChange={set('eventDate')} placeholder="e.g. Term 2, or Sun 19 Jul" /></Field>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        Three pages. By design there is NO price to enter and none is printed: page 3 stays negotiation-framed (agreed with the school after the recon visit). One SPROP serial; verify QR on the cover.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sponsorship agreement (single page, real contract, AGR serial + verify QR).
// lane is single-select (ticks + highlights the matching chip, dims the rest);
// rights are multi-select ticks mirroring the contract's own checkboxes; fee
// and in-kind value are agreed KSH figures formatted server-side.
// ---------------------------------------------------------------------------
const AGR_LANES = ['Title', 'Headline', 'Official', 'Community'];
const AGR_RIGHTS: { key: string; label: string }[] = [
  { key: 'LOGO', label: 'Logo on backdrop & banners' },
  { key: 'HOSTREAD', label: 'Host-read mentions' },
  { key: 'ACTIVATION', label: 'Activation / sampling' },
  { key: 'FEATURE', label: 'Feature in episode edit' },
  { key: 'SOCIAL', label: 'Social content & tags' },
  { key: 'EXCLUSIVITY', label: 'Category exclusivity' },
];
function AgreementForm({ agr, setAgr }: any) {
  const set = (k: string) => (e: any) => setAgr({ ...agr, [k]: e.target.value });
  const toggleRight = (k: string) => {
    const cur: string[] = agr.rightsGranted || [];
    setAgr({ ...agr, rightsGranted: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] });
  };
  const exclusivityOn = (agr.rightsGranted || []).includes('EXCLUSIVITY');
  return (
    <div>
      <Field lbl="Sponsor name (required)"><input style={inp} value={agr.sponsorName} onChange={set('sponsorName')} placeholder="Sponsor / brand legal name" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Sponsor address"><input style={inp} value={agr.sponsorAddress} onChange={set('sponsorAddress')} placeholder="P.O. Box / physical address" /></Field>
        <Field lbl="Contact person"><input style={inp} value={agr.contactPerson} onChange={set('contactPerson')} placeholder="Name & title" /></Field>
      </div>
      <Field lbl="Covering (event / stops / season)"><input style={inp} value={agr.coverage} onChange={set('coverage')} placeholder="e.g. Nairobi stop, Oct 2026" /></Field>
      <label style={label}>Partnership lane (single-select)</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {AGR_LANES.map((l) => (
          <button key={l} onClick={() => setAgr({ ...agr, lane: l })}
            style={{ ...btnSmall, background: agr.lane === l ? '#E6218C' : '#fff', color: agr.lane === l ? '#fff' : '#111' }}>{l}</button>
        ))}
      </div>
      <label style={label}>Rights granted (tick all that apply)</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {AGR_RIGHTS.map((r) => {
          const on = (agr.rightsGranted || []).includes(r.key);
          return (
            <button key={r.key} onClick={() => toggleRight(r.key)}
              style={{ ...btnSmall, background: on ? '#111' : '#fff', color: on ? '#fff' : '#111' }}>
              {on ? '✓ ' : ''}{r.label}
            </button>
          );
        })}
      </div>
      {exclusivityOn && (
        <Field lbl="Exclusivity category"><input style={inp} value={agr.exclusivityCategory} onChange={set('exclusivityCategory')} placeholder="e.g. Official soft drink" /></Field>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Sponsorship fee (KSH)"><input style={inp} type="number" min={0} value={agr.feeKsh} onChange={set('feeKsh')} placeholder="agreed figure" /></Field>
        <Field lbl="In-kind value (KSH)"><input style={inp} type="number" min={0} value={agr.inKindValue} onChange={set('inKindValue')} placeholder="agreed figure" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Payable (deposit)"><input style={inp} value={agr.paymentTerms} onChange={set('paymentTerms')} placeholder="e.g. 50%" /></Field>
        <Field lbl="Balance due by"><input type="date" style={inp} value={agr.balanceDueDate} onChange={set('balanceDueDate')} /></Field>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        The selected lane is ticked and highlighted on the contract; the others fade back. Ticked rights print as filled boxes. Fee and in-kind value are formatted as KSH. Carries a verify QR (AGR serial).
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promo / social form: the template's text blanks (a blank keeps the template
// default), a hero-image uploader per photo slot (reuses the gallery Blob
// client-upload pattern, straight to /api/admin/docs/hero-upload), and a
// partner-logo multi-select from the managed library (plus optional custom
// upload). Everything renders live; Generate exports the PNG (+ A3 PDF for
// posters).
// ---------------------------------------------------------------------------
const HERO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
function PromoForm({ type, promo, setPromo, heroImages, setHeroImages, partnerLogos, setPartnerLogos, say }: any) {
  const spec: PSpec = PROMO_SPEC[type];
  const set = (k: string) => (e: any) => setPromo({ ...promo, [k]: e.target.value });
  const [heroBusy, setHeroBusy] = useState<number | null>(null);
  const [partnerBusy, setPartnerBusy] = useState(false);

  const doHeroUpload = async (i: number, file: File, prefix: 'promo-hero' | 'promo-partner'): Promise<string | null> => {
    if (!HERO_TYPES.includes(file.type)) { say('Only JPG, PNG or WEBP images'); return null; }
    if (file.size > 8 * 1024 * 1024) { say('Image is too large - 8MB max'); return null; }
    try {
      const blob = await upload(`${prefix}/${Date.now()}-${safeName(file.name)}`, file, {
        access: 'public', handleUploadUrl: '/api/admin/docs/hero-upload',
      });
      return blob.url;
    } catch (e: any) { say('Upload failed: ' + (e?.message || 'network error')); return null; }
  };

  const onHero = async (i: number, file: File) => {
    setHeroBusy(i);
    const url = await doHeroUpload(i, file, 'promo-hero');
    if (url) { const next = heroImages.slice(); next[i] = url; setHeroImages(next); say('Hero image set'); }
    setHeroBusy(null);
  };
  const clearHero = (i: number) => { const next = heroImages.slice(); next[i] = ''; setHeroImages(next); };

  const togglePartner = (k: string) => setPartnerLogos(
    partnerLogos.includes(k) ? partnerLogos.filter((x: string) => x !== k) : [...partnerLogos, k]
  );
  const onCustomPartner = async (file: File) => {
    setPartnerBusy(true);
    const url = await doHeroUpload(0, file, 'promo-partner');
    if (url) { setPartnerLogos([...partnerLogos, url]); say('Custom partner logo added'); }
    setPartnerBusy(false);
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
        Leave a field blank to keep the template default. Output is PNG at {spec.png[0]} x {spec.png[1]}
        {spec.pdf ? ' plus an A3 PDF.' : '.'}
      </div>
      {spec.missing && spec.missing.length > 0 && (
        <div style={{ background: '#fff8e6', border: '2px solid #E0A800', borderRadius: 10, padding: 10, fontSize: 12, color: '#7a5c00', fontWeight: 600, marginBottom: 10 }}>
          Needs owner-supplied brand image(s): {spec.missing.join(', ')}. These areas render blank until the file is dropped into public/uploads.
        </div>
      )}

      <Field lbl="Event name (for your records)"><input style={inp} value={promo.eventName || ''} onChange={set('eventName')} placeholder="Names the record; not always printed" /></Field>

      {spec.fields.map((f) => (
        <Field key={f.key} lbl={f.label}>
          {f.area
            ? <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={promo[f.key] || ''} onChange={set(f.key)} placeholder={f.ph || ''} />
            : <input style={inp} value={promo[f.key] || ''} onChange={set(f.key)} placeholder={f.ph || ''} />}
        </Field>
      ))}

      {spec.heroSlots.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <label style={label}>Hero images (crop to fit the slot)</label>
          <div style={{ display: 'grid', gap: 8 }}>
            {spec.heroSlots.map((slotLabel, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, border: '2px solid #111', overflow: 'hidden', background: '#eee', flex: 'none' }}>
                  {heroImages[i]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={heroImages[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : null}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 92 }}>{slotLabel}</span>
                <label style={{ ...btnSmall, cursor: 'pointer', display: 'inline-block' }}>
                  {heroBusy === i ? 'Uploading...' : (heroImages[i] ? 'Replace' : 'Upload')}
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                    onChange={(e) => { const fl = e.target.files?.[0]; if (fl) onHero(i, fl); e.currentTarget.value = ''; }} />
                </label>
                {heroImages[i] && <button onClick={() => clearHero(i)} style={{ ...btnSmall, background: '#eee' }}>Use default</button>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Uploaded images fill the slots in order and crop with object-fit: cover.</div>
        </div>
      )}

      {spec.partners && (
        <div style={{ marginTop: 14 }}>
          <label style={label}>Partner logos (render on white chips)</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PARTNERS.map((pn) => {
              const on = partnerLogos.includes(pn.key);
              return (
                <button key={pn.key} onClick={() => togglePartner(pn.key)}
                  style={{ ...btnSmall, display: 'inline-flex', alignItems: 'center', gap: 6, background: on ? '#111' : '#fff', color: on ? '#fff' : '#111' }}>
                  <span style={{ background: '#fff', borderRadius: 4, padding: '2px 4px', display: 'inline-flex' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pn.url} alt="" style={{ height: 16, width: 'auto', display: 'block' }} />
                  </span>
                  {on ? '✓ ' : ''}{pn.label}
                </button>
              );
            })}
            <label style={{ ...btnSmall, cursor: 'pointer', background: '#FFD400' }}>
              {partnerBusy ? 'Uploading...' : '+ Custom logo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                onChange={(e) => { const fl = e.target.files?.[0]; if (fl) onCustomPartner(fl); e.currentTarget.value = ''; }} />
            </label>
          </div>
          {partnerLogos.filter((k: string) => !PARTNERS.some((pn) => pn.key === k)).length > 0 && (
            <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
              {partnerLogos.filter((k: string) => !PARTNERS.some((pn) => pn.key === k)).length} custom logo(s) added. Click a chip above to toggle library logos.
            </div>
          )}
          <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Pick none to keep the template's own partner strip (where it has one).</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quantity-batch controls (tickets / passes / bands): a quantity + Generate,
// then a ZIP of every PDF and a serial-list CSV manifest.
// ---------------------------------------------------------------------------
function QtyControls({ noun, qty, setQty, n, ready, previewBusy, busy, progress, result, onGenerate }: {
  noun: string; qty: string; setQty: (v: string) => void; n: number; ready: boolean;
  previewBusy: boolean; busy: boolean; progress: { done: number; total: number };
  result: { serials?: string[]; zipUrl?: string; zipName?: string; csvUrl?: string; csvName?: string; error?: string } | null;
  onGenerate: () => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ width: 120 }}>
          <label style={label}>Quantity (max 300)</label>
          <input style={inp} type="number" min={1} max={300} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <button onClick={onGenerate} disabled={busy || !ready} style={{ ...btnMagenta, opacity: busy || !ready ? 0.6 : 1 }}>
          {busy ? `Generating ${progress.done}/${progress.total}...` : `Generate ${n} ${noun}`}
        </button>
        {previewBusy && <span style={{ fontSize: 12, color: '#999' }}>updating preview...</span>}
      </div>
      {!ready && <div style={{ fontSize: 12, color: '#C62828', marginTop: 6, fontWeight: 600 }}>Enter an event name first.</div>}
      {busy && (
        <div style={{ marginTop: 10, height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, height: '100%', background: '#1F8A5B', transition: 'width .2s' }} />
        </div>
      )}
      {result?.error && (
        <div style={{ marginTop: 14, border: '2px solid #C62828', borderRadius: 12, padding: 14, background: '#fdf2f2', color: '#8a1f1f', fontSize: 13 }}>
          {result.error}
        </div>
      )}
      {result?.zipUrl && (
        <div style={{ marginTop: 14, border: '2px solid #1F8A5B', borderRadius: 12, padding: 14, background: '#f2fbf6' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 16, color: '#1F8A5B' }}>Issued {result.serials?.length} {noun}</div>
          <div style={{ fontSize: 12, color: '#555', margin: '6px 0 10px', wordBreak: 'break-word' }}>
            {result.serials?.[0]} ... {result.serials?.[result.serials.length - 1]}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={result.zipUrl} download={result.zipName} style={{ ...btnMagenta, textDecoration: 'none' }}>Download ZIP ({result.serials?.length} PDFs)</a>
            {result.csvUrl && <a href={result.csvUrl} download={result.csvName} style={{ ...btnDark, textDecoration: 'none' }}>Download serial CSV</a>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV batch panel: upload -> parsed preview table -> Generate All -> progress
// -> single ZIP of every PDF.
// ---------------------------------------------------------------------------
function BatchPanel({ type, csvName, csvRows, csvError, onFile, onGenerate, busy, progress, result, onClear }: {
  type: 'certw' | 'certp';
  csvName: string; csvRows: Record<string, string>[]; csvError: string;
  onFile: (f: File) => void; onGenerate: () => void; onClear: () => void;
  busy: boolean; progress: { done: number; total: number };
  result: { serials?: string[]; zipUrl?: string; zipName?: string; error?: string } | null;
}) {
  const fields = CSV_FIELDS[type];
  const headers = fields.join(',');
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ background: '#f6f8fb', border: '1px dashed #b9c3d0', borderRadius: 10, padding: 12, fontSize: 12.5, color: '#445' }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>CSV format</div>
        <div>First row is a header. Columns (in any order): <code style={{ background: '#eef1f5', padding: '1px 5px', borderRadius: 4 }}>{headers}</code></div>
        <div style={{ marginTop: 4, color: '#778' }}>
          {type === 'certw'
            ? 'recipientName is required. category, stopName and eventDate are optional. eventDate may be a plain date (2026-07-11 becomes 11 July 2026) or free text.'
            : 'participantName is required. podName and stopName are optional.'}
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ ...btn, cursor: 'pointer', display: 'inline-block' }}>
          {csvName ? 'Choose a different CSV' : 'Choose CSV file'}
          <input type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }} />
        </label>
        {csvName && <span style={{ fontSize: 12, color: '#555' }}>{csvName} - {csvRows.length} row{csvRows.length === 1 ? '' : 's'}</span>}
        {csvRows.length > 0 && <button onClick={onClear} style={{ ...btnSmall, background: '#eee' }}>Clear</button>}
      </div>

      {csvError && <div style={{ marginTop: 10, color: '#C62828', fontSize: 13, fontWeight: 600 }}>{csvError}</div>}

      {csvRows.length > 0 && (
        <div style={{ marginTop: 12, overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              <th style={th}>#</th>
              {fields.map((f) => <th key={f} style={th}>{f}</th>)}
            </tr></thead>
            <tbody>
              {csvRows.slice(0, 50).map((r, i) => {
                const idField = fields[0];
                const missing = !String(r[idField] || '').trim();
                return (
                  <tr key={i} style={missing ? { background: '#fff4f4' } : undefined}>
                    <td style={td}>{i + 1}</td>
                    {fields.map((f) => (
                      <td key={f} style={{ ...td, color: f === idField && missing ? '#C62828' : '#111', fontWeight: f === idField ? 700 : 400 }}>
                        {f === idField && missing ? '(missing)' : (r[f] || '-')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {csvRows.length > 50 && <div style={{ padding: 8, fontSize: 11, color: '#999' }}>Showing first 50 of {csvRows.length} rows.</div>}
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onGenerate} disabled={busy || csvRows.length === 0} style={{ ...btnMagenta, opacity: busy || csvRows.length === 0 ? 0.6 : 1 }}>
          {busy ? `Generating ${progress.done}/${progress.total}...` : `Generate all (${csvRows.length})`}
        </button>
        {busy && (
          <div style={{ flex: 1, minWidth: 120, height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, height: '100%', background: '#1F8A5B', transition: 'width .2s' }} />
          </div>
        )}
      </div>

      {result?.error && (
        <div style={{ marginTop: 14, border: '2px solid #C62828', borderRadius: 12, padding: 14, background: '#fdf2f2', color: '#8a1f1f', fontSize: 13 }}>
          {result.error}
        </div>
      )}
      {result?.zipUrl && (
        <div style={{ marginTop: 14, border: '2px solid #1F8A5B', borderRadius: 12, padding: 14, background: '#f2fbf6' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 16, color: '#1F8A5B' }}>Issued {result.serials?.length} certificates</div>
          <div style={{ fontSize: 12, color: '#555', margin: '6px 0 10px', wordBreak: 'break-word' }}>
            {result.serials?.[0]} ... {result.serials?.[result.serials.length - 1]}
          </div>
          <a href={result.zipUrl} download={result.zipName} style={{ ...btnMagenta, textDecoration: 'none' }}>Download ZIP ({result.serials?.length} PDFs)</a>
        </div>
      )}
    </div>
  );
}

function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontWeight: bold ? 800 : 500, fontSize: bold ? 15 : 13 }}>
      <span>{k}</span><span>{v}</span>
    </div>
  );
}
