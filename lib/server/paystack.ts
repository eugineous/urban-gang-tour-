// Paystack (cards + local rails for Kenyan merchants; test/live by key).
// Server-side only. All amounts are KES subunits (KES * 100).
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
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!paystackConfigured()) return { ok: false, error: 'not_configured' };
  try {
    const r = await fetch(`${API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amountKes * 100),
        currency: 'KES',
        reference: params.reference,
        callback_url: params.callbackUrl,
        channels: ['card'],
        metadata: params.metadata || {},
      }),
    });
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok || !d.status || !d.data?.authorization_url) {
      return { ok: false, error: `paystack_${r.status}: ${String(d.message || '').slice(0, 200)}` };
    }
    return { ok: true, url: d.data.authorization_url };
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
