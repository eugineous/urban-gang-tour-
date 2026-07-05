// Safaricom Daraja - Lipa Na M-Pesa Online (STK Push).
// MPESA_ENV=sandbox uses the shared Safaricom test shortcode/passkey; switching
// to production only requires swapping the five MPESA_* env vars, no code change.
const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("MPESA_CONSUMER_KEY/SECRET not configured");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

// Kenyan numbers only, normalized to the 2547XXXXXXXX / 2541XXXXXXXX form Daraja requires.
export function normalizeMsisdn(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
}

// amountKes must come from a server-side order lookup - never trust a
// client-supplied amount for a real charge.
export async function initiateStkPush(params: {
  phone: string;
  amountKes: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}): Promise<StkPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) throw new Error("MPESA_SHORTCODE/PASSKEY not configured");

  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amountKes),
      PartyA: params.phone,
      PartyB: shortcode,
      PhoneNumber: params.phone,
      CallBackURL: params.callbackUrl,
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: params.transactionDesc.slice(0, 13),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "STK push request failed");
  }
  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
  };
}

// Safaricom's callback payload shape for Lipa Na M-Pesa Online.
export interface StkCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

export function parseStkCallback(payload: StkCallback) {
  const cb = payload.Body.stkCallback;
  const items = cb.CallbackMetadata?.Item || [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;
  return {
    merchantRequestId: cb.MerchantRequestID,
    checkoutRequestId: cb.CheckoutRequestID,
    success: cb.ResultCode === 0,
    resultDesc: cb.ResultDesc,
    amount: get("Amount") as number | undefined,
    mpesaReceiptNumber: get("MpesaReceiptNumber") as string | undefined,
    transactionDate: get("TransactionDate") as number | undefined,
    phoneNumber: get("PhoneNumber") as number | undefined,
  };
}
