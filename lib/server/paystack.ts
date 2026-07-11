// Paystack (cards + local rails for Kenyan merchants; test/live by key).
// Server-side only. All amounts are KES subunits (KES * 100).
//
// Marketplace split-payment note (verified against Paystack's live API docs
// before writing this — see the build report for the exact quoted fields):
//   - POST /subaccount's `percentage_charge` is "the percentage the MAIN
//     account receives from each payment made to the subaccount" — i.e. it
//     is UGT's cut, NOT the organizer's share. Easy to get backwards; do not
//     flip this.
//   - We do NOT rely on the subaccount's stored percentage_charge at
//     checkout time (it would drift from a live-editable commission
//     setting). Instead every marketplace checkout passes `transaction_charge`
//     explicitly — "an amount [in subunits] used to override the split
//     configuration for a single split payment; the amount specified goes to
//     the main account regardless of the split configuration" — computed
//     fresh from the current commission percent on every single checkout.
//     This is what makes the admin-editable commission percent "live": the
//     subaccount's own percentage_charge is just a required-field fallback,
//     never the source of truth.
//   - `bearer` controls who pays Paystack's own processing fee: 'account'
//     (default) or 'subaccount'. We explicitly pass 'account' — UGT eats the
//     Paystack processing fee, so the organizer's payout is always exactly
//     total - commission_amount, with no surprise deduction. This is a
//     deliberate business choice, documented here so it is never silently
//     re-decided by a future edit.
const API = 'https://api.paystack.co';

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export async function paystackInit(params: {
  email: string;
  amountKes: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  // Marketplace split (omit for UGT's own internal checkouts).
  subaccountCode?: string;
  transactionChargeKes?: number; // goes to the MAIN (UGT) account, in KES (converted to subunits below)
  bearer?: 'account' | 'subaccount';
}): Promise<{ ok: boolean; url?: string; error?: string; requestPayload?: Record<string, unknown> }> {
  if (!paystackConfigured()) return { ok: false, error: 'not_configured' };
  try {
    const payload: Record<string, unknown> = {
      email: params.email,
      amount: Math.round(params.amountKes * 100),
      currency: 'KES',
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels: ['card'],
      metadata: params.metadata || {},
    };
    if (params.subaccountCode) {
      payload.subaccount = params.subaccountCode;
      payload.bearer = params.bearer || 'account';
      if (typeof params.transactionChargeKes === 'number') {
        payload.transaction_charge = Math.round(params.transactionChargeKes * 100);
      }
    }
    const r = await fetch(`${API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok || !d.status || !d.data?.authorization_url) {
      return { ok: false, error: `paystack_${r.status}: ${String(d.message || '').slice(0, 200)}`, requestPayload: payload };
    }
    return { ok: true, url: d.data.authorization_url, requestPayload: payload };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

// Fetch a transaction's status by reference (used by the success page).
export async function paystackVerify(reference: string): Promise<{ ok: boolean; paid?: boolean; amountKes?: number }> {
  if (!paystackConfigured()) return { ok: false };
  try {
    const r = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok || !d.status) return { ok: false };
    return { ok: true, paid: d.data?.status === 'success', amountKes: (d.data?.amount || 0) / 100 };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Subaccounts (marketplace organizer payout targets).
// ---------------------------------------------------------------------------

export interface CreateSubaccountParams {
  businessName: string;
  settlementBank: string; // Paystack bank CODE, not the display name
  accountNumber: string;
  percentageChargeMainAccount: number; // UGT's cut, e.g. 8 for 8%
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
}

export async function paystackCreateSubaccount(
  p: CreateSubaccountParams
): Promise<{ ok: boolean; subaccountCode?: string; raw?: any; error?: string }> {
  if (!paystackConfigured()) return { ok: false, error: 'not_configured' };
  try {
    const r = await fetch(`${API}/subaccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name: p.businessName,
        settlement_bank: p.settlementBank,
        account_number: p.accountNumber,
        percentage_charge: p.percentageChargeMainAccount,
        primary_contact_email: p.contactEmail || undefined,
        primary_contact_name: p.contactName || undefined,
        primary_contact_phone: p.contactPhone || undefined,
      }),
    });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok || !d.status || !d.data?.subaccount_code) {
      return { ok: false, error: `paystack_${r.status}: ${String(d.message || '').slice(0, 300)}`, raw: d };
    }
    return { ok: true, subaccountCode: d.data.subaccount_code, raw: d.data };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 300) };
  }
}

export interface PaystackBank {
  name: string;
  code: string;
  currency: string;
}

// Live bank list (Kenya) — used by the organizer signup form so the admin
// approval step always has a valid Paystack bank CODE, not a free-text name.
let bankCache: { at: number; data: PaystackBank[] } | null = null;
const BANK_CACHE_TTL_MS = 6 * 3600_000;

export async function paystackListBanks(): Promise<PaystackBank[]> {
  if (bankCache && Date.now() - bankCache.at < BANK_CACHE_TTL_MS) return bankCache.data;
  if (!paystackConfigured()) return bankCache?.data || [];
  try {
    const r = await fetch(`${API}/bank?country=kenya&currency=KES`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok || !d.status || !Array.isArray(d.data)) return bankCache?.data || [];
    const banks: PaystackBank[] = d.data.map((b: any) => ({ name: String(b.name), code: String(b.code), currency: String(b.currency || 'KES') }));
    bankCache = { at: Date.now(), data: banks };
    return banks;
  } catch {
    return bankCache?.data || [];
  }
}
