// M-Pesa Daraja STK push — fully wired, activated by env vars:
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
//   MPESA_PASSKEY, MPESA_ENV ("sandbox" | "production"), MPESA_CALLBACK_URL
const BASE = () =>
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

export function mpesaConfigured(): boolean {
  return !!(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY
  );
}

async function accessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');
  const res = await fetch(`${BASE()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`daraja auth failed: ${res.status}`);
  const j = await res.json();
  return j.access_token;
}

// Normalize Kenyan phone to 2547XXXXXXXX / 2541XXXXXXXX
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (/^254(7|1)\d{8}$/.test(d)) return d;
  if (/^0(7|1)\d{8}$/.test(d)) return '254' + d.slice(1);
  if (/^(7|1)\d{8}$/.test(d)) return '254' + d;
  return null;
}

export async function stkPush(phone: string, amount: number, ref: string, desc: string) {
  const token = await accessToken();
  const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const shortcode = process.env.MPESA_SHORTCODE!;
  const password = Buffer.from(shortcode + process.env.MPESA_PASSKEY + ts).toString('base64');
  const res = await fetch(`${BASE()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL:
        process.env.MPESA_CALLBACK_URL || 'https://urbangangtour.co.ke/api/mpesa/callback',
      AccountReference: ref.slice(0, 12),
      TransactionDesc: desc.slice(0, 13),
    }),
  });
  return res.json();
}
