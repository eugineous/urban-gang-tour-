// Pure, deterministic budget maths for the UGT ops suite.
// Shared by the admin UI (live recompute on every keystroke), the ops API
// and the PDF renderer, so every surface always agrees. No AI, no storage
// of computed totals: everything here is derived from inputs at call time.
// Unknown amounts are null and are excluded from totals ("TBD").

export type DistanceBand = 'near' | 'mid' | 'far';
export type SoundMode = 'partner_favour' | 'full_pa';
export type StageOption = 'canopy' | 'no_canopy';

export interface BudgetLine {
  id: string;
  label: string;
  amount: number | null; // null = TBD, excluded from totals
  kind: 'default' | 'custom';
}

export interface BudgetData {
  eventName: string;
  school: string;
  eventDate: string; // YYYY-MM-DD
  distanceBand: DistanceBand;
  expectedIncome: number | null;
  studentCount: number | null;
  soundMode: SoundMode;
  soundCost: number | null; // editable, prefilled from SOUND_DEFAULTS
  stageOption: StageOption;
  stageCost: number | null; // editable, prefilled from STAGE_DEFAULTS
  lines: BudgetLine[]; // default + custom line items
  crewCount: number; // ALWAYS an input, never hardcoded
  crewRate: number;
  teacherPct: number; // percent of gross income, default 10, always visible
  contingencyPct: number; // percent of production cost, default 7.5, range 5 to 10
}

export const SOUND_DEFAULTS: Record<SoundMode, number> = {
  partner_favour: 6000, // transport only, sound itself is a partner favour
  full_pa: 80000,
};

export const STAGE_DEFAULTS: Record<StageOption, number> = {
  canopy: 50000, // 16 boards with canopy
  no_canopy: 30000, // 16 boards, no canopy
};

export const CREW_TRANSPORT_BY_BAND: Record<DistanceBand, number> = {
  near: 5000,
  mid: 12000,
  far: 20000,
};

export const CREW_RATE_OPTIONS = [1000, 1500, 2500];

// Display-only reference floors, never used in any calculation.
export const FLOOR_REFERENCES: Array<[string, number]> = [
  ['High school, partner sound', 200000],
  ['High school, full PA', 250000],
  ['Campus', 250000],
  ['Mega event', 350000],
];

export const PER_STUDENT_BAND: [number, number] = [200, 500];

export const DEFAULT_LINE_LABELS: Array<{ label: string; amount: (band: DistanceBand) => number | null }> = [
  { label: 'Colours and paints', amount: () => null },
  { label: 'Music: headliner + supporting acts', amount: () => null },
  { label: 'Awards and gifts', amount: () => null },
  { label: 'Banner and branding', amount: () => null },
  { label: 'Crew transport', amount: (band) => CREW_TRANSPORT_BY_BAND[band] },
  { label: 'First aid standby', amount: () => 5000 },
];

let lineSeq = 0;
export function newLineId(): string {
  lineSeq += 1;
  return 'ln_' + Date.now().toString(36) + '_' + lineSeq;
}

export function emptyBudget(): BudgetData {
  return {
    eventName: '',
    school: '',
    eventDate: '',
    distanceBand: 'near',
    expectedIncome: null,
    studentCount: null,
    soundMode: 'partner_favour',
    soundCost: SOUND_DEFAULTS.partner_favour,
    stageOption: 'no_canopy',
    stageCost: STAGE_DEFAULTS.no_canopy,
    lines: DEFAULT_LINE_LABELS.map((d) => ({ id: newLineId(), label: d.label, amount: d.amount('near'), kind: 'default' as const })),
    crewCount: 0,
    crewRate: 1500,
    teacherPct: 10,
    contingencyPct: 7.5,
  };
}

export interface ComputedLine {
  label: string;
  amount: number | null; // null = TBD
  tbd: boolean;
}

export interface BudgetResult {
  costLines: ComputedLine[]; // sound + stage + all line items (production side)
  productionCost: number; // sum of known production lines
  tbdCount: number; // how many lines are TBD (excluded, needs warning badge)
  crewPay: number; // crewCount x crewRate
  teacherPct: number;
  teacherCut: number; // teacherPct% of expected income
  contingencyPct: number; // clamped 5 to 10
  contingency: number; // of production cost
  grandTotal: number; // production + crew pay + teacher cut + contingency
  income: number;
  profit: number; // income minus grand total
  profitTone: 'green' | 'orange' | 'red';
  partnerSaving: number; // full PA default minus partner cost, display only
  crewFundingShortfall: boolean; // income minus non-crew costs < crew pay
  crewFundingHeadroom: number; // income minus non-crew costs minus crew pay
  perStudent: number | null; // grand total / student count
}

function num(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function clampContingency(pct: number): number {
  const n = Number.isFinite(pct) ? pct : 7.5;
  return Math.min(10, Math.max(5, n));
}

export function computeBudget(b: BudgetData): BudgetResult {
  const costLines: ComputedLine[] = [];

  const soundCost = num(b.soundCost);
  costLines.push({
    label: b.soundMode === 'partner_favour' ? 'Sound: partner favour (transport only)' : 'Sound: full PA hire',
    amount: soundCost,
    tbd: soundCost === null,
  });

  const stageCost = num(b.stageCost);
  costLines.push({
    label: b.stageOption === 'canopy' ? 'Stage: 16 boards with canopy' : 'Stage: 16 boards, no canopy',
    amount: stageCost,
    tbd: stageCost === null,
  });

  for (const ln of b.lines || []) {
    const a = num(ln.amount);
    costLines.push({ label: ln.label || 'Unnamed item', amount: a, tbd: a === null });
  }

  const productionCost = costLines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const tbdCount = costLines.filter((l) => l.tbd).length;

  const crewCount = Math.max(0, Math.floor(Number(b.crewCount) || 0));
  const crewRate = Math.max(0, Number(b.crewRate) || 0);
  const crewPay = crewCount * crewRate;

  const income = Math.max(0, num(b.expectedIncome) ?? 0);
  const teacherPct = Math.max(0, Number(b.teacherPct) || 0);
  const teacherCut = Math.round((teacherPct / 100) * income);

  const contingencyPct = clampContingency(Number(b.contingencyPct));
  const contingency = Math.round((contingencyPct / 100) * productionCost);

  const grandTotal = productionCost + crewPay + teacherCut + contingency;
  const profit = income - grandTotal;

  let profitTone: BudgetResult['profitTone'] = 'green';
  if (profit < 0) profitTone = income > 0 && Math.abs(profit) <= income * 0.05 ? 'orange' : 'red';

  const partnerSaving = b.soundMode === 'partner_favour' ? Math.max(0, SOUND_DEFAULTS.full_pa - (soundCost ?? 0)) : 0;

  const nonCrewCosts = productionCost + teacherCut + contingency;
  const crewFundingHeadroom = income - nonCrewCosts - crewPay;
  const crewFundingShortfall = crewPay > 0 && income - nonCrewCosts < crewPay;

  const students = num(b.studentCount);
  const perStudent = students && students > 0 ? Math.round(grandTotal / students) : null;

  return {
    costLines, productionCost, tbdCount, crewPay,
    teacherPct, teacherCut, contingencyPct, contingency,
    grandTotal, income, profit, profitTone, partnerSaving,
    crewFundingShortfall, crewFundingHeadroom, perStudent,
  };
}

// ---- Documents (quotes, invoices, receipts) ----

export interface DocLine {
  label: string;
  qty: number;
  amount: number; // unit amount in KES
}

// Totals are always derived from lines at render time, never stored.
export function docTotals(lines: DocLine[]): { subtotal: number; total: number } {
  const subtotal = (lines || []).reduce((s, l) => s + Math.max(0, Number(l.qty) || 0) * (Number(l.amount) || 0), 0);
  return { subtotal, total: subtotal };
}

export function docBalance(lines: DocLine[], paid: number): number {
  return docTotals(lines).total - (Number(paid) || 0);
}

// Effective status is derived at render time: overdue is automatic when the
// due date has passed and a balance remains.
export function effectiveDocStatus(storedStatus: string, docType: string, lines: DocLine[], paid: number, dueDate: string | null, today?: string): string {
  if (docType !== 'invoice') return storedStatus;
  if (storedStatus === 'draft' || storedStatus === 'paid') return storedStatus;
  const balance = docBalance(lines, paid);
  if (balance <= 0) return 'paid';
  if (dueDate) {
    const t = today || new Date().toISOString().slice(0, 10);
    if (String(dueDate).slice(0, 10) < t) return 'overdue';
  }
  return storedStatus;
}

export function fmtKES(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return 'TBD';
  return 'KES ' + Math.round(Number(n)).toLocaleString('en-KE');
}
