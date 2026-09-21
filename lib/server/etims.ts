// eTIMS adapter interface. Kenya Revenue Authority requires persons engaged
// in business to onboard to eTIMS and issue electronic tax invoices.
//
// This is NOT a live integration. No tax rate is hardcoded. No invoice is
// claimed as KRA-submitted. The Control Room and receipt PDF can later call
// `buildEtisPayload` once the owner has confirmed the applicable accounting
// treatment and supplied real device/PIN credentials.

export type EtisInvoiceDraft = {
  orderId: string;
  buyerName: string;
  buyerPin?: string | null;
  lines: { description: string; qty: number; unitKes: number }[];
  totalKes: number;
  currency: 'KES';
  issuedAt: string;
};

export type EtisAdapterResult =
  | { ok: false; reason: 'not_configured' | 'not_implemented' }
  | { ok: true; cuInvoiceNumber: string };

export function etimsConfigured(): boolean {
  return Boolean(process.env.ETIMS_DEVICE_SERIAL && process.env.ETIMS_PIN);
}

export async function submitEtisInvoice(_draft: EtisInvoiceDraft): Promise<EtisAdapterResult> {
  if (!etimsConfigured()) return { ok: false, reason: 'not_configured' };
  return { ok: false, reason: 'not_implemented' };
}
