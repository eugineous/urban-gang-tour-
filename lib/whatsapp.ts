// WhatsApp Business Platform senders (server-side only).
// Configured via env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
// Free-form text works inside the 24h customer-service window; outside it
// Meta requires an approved template (sendWhatsAppTemplate).

const GRAPH = 'https://graph.facebook.com/v21.0';

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function send(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  if (!isWhatsAppConfigured()) return { ok: false, error: 'whatsapp_not_configured' };
  try {
    const r = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return { ok: false, error: `graph_${r.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

// to: E.164 without plus, e.g. 2547XXXXXXXX
export function sendWhatsAppText(to: string, body: string) {
  return send({ to, type: 'text', text: { preview_url: false, body: body.slice(0, 4096) } });
}

export function sendWhatsAppTemplate(to: string, templateName: string, langCode = 'en') {
  return send({ to, type: 'template', template: { name: templateName, language: { code: langCode } } });
}
