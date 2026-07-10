import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { alertCritical } from '@/lib/server/alert';

// Signature-failure burst detector: a spike of bad signatures means either a
// misconfigured app secret or someone probing the webhook. Alert once per
// window, never per request. Per-instance state, same as the rate limiter.
let sigFails = 0;
let sigWindow = Date.now();
let sigAlerted = false;
function noteSignatureFailure() {
  const now = Date.now();
  if (now - sigWindow > 60_000) { sigWindow = now; sigFails = 0; sigAlerted = false; }
  sigFails += 1;
  if (sigFails > 10 && !sigAlerted) {
    sigAlerted = true;
    void alertCritical('WhatsApp webhook signature-failure burst', `${sigFails} bad signatures in the last minute`);
  }
}

// WhatsApp Business Platform webhook (Meta).
// GET  = one-time verification handshake from the Meta console.
// POST = incoming messages/status updates, signature-checked against the
//        app secret. Log-and-200 for now; routing into bookings/support
//        conversations is the next phase.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse('forbidden', { status: 403 });
}

export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const raw = await req.text();
  if (secret) {
    const sig = req.headers.get('x-hub-signature-256') || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      noteSignatureFailure();
      return new NextResponse('bad signature', { status: 401 });
    }
  } else {
    // without the app secret we cannot authenticate senders; refuse rather
    // than process unverifiable input
    return new NextResponse('webhook not configured', { status: 503 });
  }

  try {
    const body = JSON.parse(raw);
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const v = change.value || {};
        for (const m of v.messages || []) {
          console.log('[whatsapp] message', JSON.stringify({
            from: m.from, type: m.type, text: m.text?.body?.slice(0, 200),
          }));
        }
        for (const s of v.statuses || []) {
          console.log('[whatsapp] status', JSON.stringify({ id: s.id, status: s.status }));
        }
      }
    }
  } catch {
    // malformed payload - still 200 so Meta does not retry forever
  }
  return new NextResponse('ok', { status: 200 });
}
