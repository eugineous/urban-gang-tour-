import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ensureTickets, getEventMeta, getEventName, type TicketRow } from '@/lib/server/tickets';

// All e-tickets of one order. Roles: public (anon) - the unguessable ORD- id
// is the bearer, same model as /receipt/[id]. This page is also the lazy-mint
// safety net: a paid ticket order that somehow missed webhook minting gets its
// tickets minted right here on first view.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Tickets | Urban Gang Tour',
  description: 'Your Urban Gang Tour e-tickets.',
  robots: { index: false, follow: false },
};

const ID_RE = /^ORD-[A-Z0-9-]{4,40}$/;

const CSS = `
.tks-stage{min-height:100svh;padding:32px 16px 56px;background:#f4f4f4;color:#151515;font-family:Inter,system-ui,sans-serif}.tks-wrap{max-width:560px;margin:auto}.tks-head{margin-bottom:24px}.tks-head img{width:72px;height:48px;object-fit:contain}.tks-title{font-size:40px;font-weight:600;letter-spacing:-.04em;line-height:1.1;margin:20px 0 12px}.tks-sub{font-size:14px;line-height:1.6;color:#686268;overflow-wrap:anywhere}.tks-sub b{color:#86104f}.tks-grid{display:grid;gap:20px}.tks-edge{border:1px solid #d6cbd1;border-radius:20px;overflow:hidden;background:#fff}.tks-card{display:flex;align-items:center;gap:16px;padding:24px;text-decoration:none;color:#151515}.tks-num{flex-shrink:0;width:48px;display:grid;gap:4px;text-align:center}.tks-num b{font-size:24px;line-height:1}.tks-num span{font-size:11px;color:#686268}.tks-info{flex:1;min-width:0}.tks-ev{font-size:20px;font-weight:600;line-height:1.3;overflow-wrap:anywhere}.tks-tier{display:inline-block;font-size:14px;border-radius:8px;background:#f7e8ef;color:#86104f;padding:5px 10px;margin-top:8px}.tks-tier.gold{background:#fff0b0;color:#534300}.tks-codeline{font:12px/1.6 ui-monospace,monospace;overflow-wrap:anywhere;color:#686268;margin-top:8px}.tks-open,.tks-usedtag{font-size:13px;color:#86104f;flex-shrink:0}.tks-usedtag{color:#a61925}.tks-pdfrow{display:flex;justify-content:center;align-items:center;min-height:48px;border-top:1px solid #e4dce0;color:#86104f;font-size:15px}.tks-pdfrow:hover{background:#f7e8ef}.tks-note{background:#fff;border:1px solid #d6cbd1;border-radius:16px;padding:20px;font-size:16px;line-height:1.7;margin-block:24px}.tks-note b{color:#86104f}.tks-links{display:flex;flex-wrap:wrap;gap:16px;margin-top:24px}.tks-links a{display:flex;align-items:center;justify-content:center;min-height:48px;background:white;border:1px solid #d6cbd1;border-radius:12px;padding:12px 20px;color:#86104f}.tks-slogan{font-size:14px;color:#686268;margin-top:32px}.tks-stage a:focus-visible{outline:3px solid #21c7e6;outline-offset:3px}@media(max-width:480px){.tks-card{flex-wrap:wrap;padding:20px}.tks-open,.tks-usedtag{margin-left:64px}.tks-title{font-size:36px}}@media(max-width:280px){.tks-info{flex-basis:100%}.tks-open,.tks-usedtag{margin-left:0}.tks-title{font-size:30px}}
`;

async function getOrder(id: string) {
  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return null;
    const rows = await q(`SELECT * FROM orders WHERE id=$1`, [id]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export default async function OrderTicketsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId: rawId } = await params;
  const id = decodeURIComponent(rawId || '');
  if (!ID_RE.test(id)) notFound();
  const o = await getOrder(id);
  if (!o) notFound();

  const paid = o.status === 'paid' || o.status === 'fulfilled';
  let tickets: TicketRow[] = [];
  try {
    tickets = await ensureTickets(o); // lazy mint: paid order can never lack tickets
  } catch (e) {
    console.error('[tickets-page]', e);
  }

  const meta = tickets.length ? await getEventMeta(tickets[0].event_id, tickets[0].marketplace_event_id) : undefined;
  // Resolve names for every distinct event on this order up front — the grid
  // below renders synchronously, so nothing in the .map() can itself await.
  const eventIds = Array.from(new Set(tickets.map((t) => t.event_id)));
  const eventNames = Object.fromEntries(
    await Promise.all(
      eventIds.map(async (id) => {
        const mkt = tickets.find((t) => t.event_id === id)?.marketplace_event_id || null;
        return [id, await getEventName(id, mkt)] as const;
      })
    )
  );

  return (
    <div className="tks-stage">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="tks-wrap">
        <div className="tks-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/ugt-logo.png" alt="Urban Gang Tour" />
          <h1 className="tks-title">Your tickets</h1>
          <div className="tks-sub">ORDER <b>{id}</b>{meta ? <> &middot; {meta.date}</> : null}</div>
        </div>

        {!paid ? (
          <div className="tks-note">
            <b>Payment pending.</b> Your tickets appear here the moment payment is confirmed.
            If you just completed the M-Pesa prompt, refresh in a few seconds.
          </div>
        ) : tickets.length === 0 ? (
          <div className="tks-note">
            This order has no event tickets. Check your <a href={`/receipt/${encodeURIComponent(id)}`} style={{ color: '#86104f' }}>receipt</a> for the full order details.
          </div>
        ) : (
          <div className="tks-grid">
            {tickets.map((t) => {
              const vip = /vip/i.test(t.tier_name);
              const used = !!t.used_at;
              return (
                <div className={'tks-edge' + (used ? ' used' : '')} key={t.code}>
                  <a className="tks-card" href={`/t/${encodeURIComponent(t.code)}`}>
                    <span className="tks-num"><b>{t.position}</b><span>OF {t.of_count}</span></span>
                    <span className="tks-info">
                      <span className="tks-ev">{eventNames[t.event_id]}</span>
                      <br />
                      <span className={'tks-tier' + (vip ? ' gold' : '')}>{t.tier_name}</span>
                      <div className="tks-codeline">{t.code}</div>
                    </span>
                    {used ? <span className="tks-usedtag">USED</span> : <span className="tks-open">OPEN &rarr;</span>}
                  </a>
                  <a className="tks-pdfrow" href={`/api/tickets/${encodeURIComponent(t.code)}/pdf`}>Download PDF</a>
                </div>
              );
            })}
          </div>
        )}

        {paid && tickets.length > 0 ? (
          <div className="tks-note" style={{ marginTop: 22 }}>
            Each ticket admits <b>one person</b> and has its own QR code - open it, screenshot it,
            or forward the link to whoever is coming with you. It gets scanned once at the gate.
          </div>
        ) : null}

        <div className="tks-links">
          <a href={`/receipt/${encodeURIComponent(id)}`}>View receipt</a>
          <a href="/events">Events</a>
        </div>
        <div className="tks-slogan">From Potential to Purpose</div>
      </div>
    </div>
  );
}
