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
/* fixed overlay above the site chrome - same stage as /t/[code] */
body{overflow:hidden}
.tks-stage{position:fixed;inset:0;z-index:12000;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding:34px 16px 60px;font-family:'Space Grotesk',system-ui,sans-serif;color:#fff;background:#0c0c0c;
  background:radial-gradient(90% 50% at 50% 0%,rgba(230,33,140,.13),transparent 62%),
    radial-gradient(75% 45% at 88% 100%,rgba(33,199,230,.09),transparent 60%),
    radial-gradient(140% 100% at 50% 42%,#141414 0%,#0c0c0c 58%,#050505 100%)}
.tks-wrap{max-width:440px;margin:0 auto}
.tks-head{text-align:center;margin-bottom:22px}
.tks-head img{height:44px;width:auto}
.tks-title{font-family:'Anton','Arial Black',sans-serif;font-size:clamp(28px,8vw,38px);text-transform:uppercase;line-height:1;margin:10px 0 6px}
.tks-sub{font-size:12px;color:#9a9aa4;letter-spacing:.08em}
.tks-sub b{color:#FFD400;font-family:ui-monospace,'Courier New',monospace;letter-spacing:.1em}
.tks-grid{display:grid;gap:14px;margin-top:18px}
.tks-edge{border-radius:18px;padding:3px;background:linear-gradient(135deg,#E6218C 0%,#FFD400 70%);box-shadow:0 14px 34px rgba(0,0,0,.5)}
.tks-edge.used{background:linear-gradient(135deg,#555,#333)}
.tks-card{display:flex;align-items:center;gap:14px;background:#111;border-radius:15px;padding:14px 16px;text-decoration:none;color:#fff}
.tks-num{flex:none;width:44px;height:44px;border-radius:12px;border:2px solid #FFD400;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700}
.tks-num b{font-family:'Anton','Arial Black',sans-serif;font-size:18px;color:#FFD400;line-height:1}
.tks-num span{font-size:8px;letter-spacing:.1em;color:#9a9aa4}
.tks-info{flex:1;min-width:0}
.tks-ev{font-family:'Anton','Arial Black',sans-serif;font-size:15px;text-transform:uppercase;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tks-tier{display:inline-block;font-family:'Permanent Marker',cursive;font-size:11px;color:#111;background:#21C7E6;border-radius:4px;padding:2px 8px;margin-top:5px;transform:rotate(-2deg)}
.tks-tier.gold{background:#FFD400}
.tks-codeline{font-family:ui-monospace,'Courier New',monospace;font-size:10.5px;letter-spacing:.1em;color:#bdbdc6;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tks-open{flex:none;font-size:9px;font-weight:700;letter-spacing:.16em;color:#21C7E6;border:1px solid rgba(33,199,230,.6);border-radius:999px;padding:5px 9px;white-space:nowrap}
.tks-pdfrow{display:block;text-align:center;font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#FFD400;text-decoration:none;background:#111;border-radius:10px;padding:7px;margin-top:6px}
.tks-pdfrow:hover{color:#fff}
.tks-usedtag{flex:none;font-size:9px;font-weight:700;letter-spacing:.14em;color:#ff6b6b;border:1px solid rgba(255,80,80,.6);border-radius:999px;padding:5px 9px;white-space:nowrap}
.tks-note{border:3px solid #FFD400;border-radius:14px;background:rgba(255,212,0,.06);padding:16px 18px;font-size:13px;line-height:1.65;color:#eee;margin-top:18px}
.tks-note b{color:#FFD400}
.tks-links{display:flex;gap:10px;margin-top:26px;flex-wrap:wrap;justify-content:center}
.tks-links a{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fff;text-decoration:none;border:2px solid rgba(255,255,255,.35);border-radius:999px;padding:9px 16px}
.tks-links a:hover{border-color:#FFD400;color:#FFD400}
.tks-slogan{text-align:center;font-family:'Permanent Marker',cursive;font-size:13px;color:#FFD400;margin-top:26px}`;

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
          <img src="/assets/ugt-logo-v2.png" alt="Urban Gang Tour" />
          <div className="tks-title">Your Tickets</div>
          <div className="tks-sub">ORDER <b>{id}</b>{meta ? <> &middot; {meta.date}</> : null}</div>
        </div>

        {!paid ? (
          <div className="tks-note">
            <b>Payment pending.</b> Your tickets appear here the moment payment is confirmed.
            If you just completed the M-Pesa prompt, refresh in a few seconds.
          </div>
        ) : tickets.length === 0 ? (
          <div className="tks-note">
            This order has no event tickets. Check your <a href={`/receipt/${encodeURIComponent(id)}`} style={{ color: '#FFD400' }}>receipt</a> for the full order details.
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
