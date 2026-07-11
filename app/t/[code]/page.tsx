import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { codeAuthentic, getTicket, EVENT_META, eventName } from '@/lib/server/tickets';

// The digital ticket - a phone-screen artifact people screenshot and flex.
// Roles: public (anon); the self-authenticating TKT- code is the bearer, same
// model as /receipt/[id]. Shows holder first name only plus event data - no
// contact info. Server-rendered every request (used/pending state is live).

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your E-Ticket | Urban Gang Tour',
  description: 'Official Urban Gang Tour e-ticket. Scan at the gate.',
  robots: { index: false, follow: false },
};

const SITE = 'https://urbangangtour.co.ke';

function eatStamp(d: Date): string {
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Africa/Nairobi' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) +
    ' EAT'
  );
}

const CSS = `
/* fixed overlay: the ticket is a full-screen artifact - it sits above the
   site chrome (header/footer/cookie bar) instead of being wrapped by it */
body{overflow:hidden}
.tk-stage{position:fixed;inset:0;z-index:12000;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  display:flex;padding:16px 16px 30px;font-family:'Space Grotesk',system-ui,sans-serif;color:#fff;background:#0c0c0c;
  background:radial-gradient(90% 55% at 50% 0%,rgba(230,33,140,.13),transparent 62%),
    radial-gradient(75% 45% at 88% 100%,rgba(33,199,230,.09),transparent 60%),
    radial-gradient(140% 100% at 50% 42%,#141414 0%,#0c0c0c 58%,#050505 100%)}
.tk-mid{margin:auto;width:min(400px,100%);display:flex;flex-direction:column;align-items:center}
.tk-edge{position:relative;border-radius:24px;padding:4px;width:min(400px,100%);
  background:linear-gradient(135deg,#E6218C 0%,#ff5db1 28%,#FFD400 62%,#E6218C 135%);
  box-shadow:0 26px 60px rgba(0,0,0,.6),10px 10px 0 rgba(230,33,140,.15)}
.tk-card{position:relative;background:#111;border:3px solid #111;border-radius:20px;overflow:hidden}
.tk-card::after{content:'';position:absolute;inset:-40%;pointer-events:none;z-index:4;
  background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.07) 46%,rgba(230,33,140,.13) 50%,rgba(255,212,0,.11) 54%,rgba(255,255,255,.06) 58%,transparent 66%);
  transform:translateX(-75%);animation:tkholo 6s ease-in-out infinite}
@keyframes tkholo{0%{transform:translateX(-75%)}58%{transform:translateX(75%)}100%{transform:translateX(75%)}}
.tk-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 18px 10px}
.tk-top img{height:30px;width:auto}
.tk-ppp{font-family:'Bungee',cursive;font-size:8.5px;letter-spacing:.14em;color:#FFD400;border:1px solid rgba(255,212,0,.7);border-radius:999px;padding:4px 9px;white-space:nowrap}
.tk-rule{height:2px;margin:0 18px;background:linear-gradient(90deg,transparent,#FFD400 18%,#FFD400 82%,transparent)}
.tk-body{padding:13px 20px 14px}
.tk-live{display:inline-flex;align-items:center;gap:6px;font-size:9px;letter-spacing:.24em;color:#9a9aa4;text-transform:uppercase;font-weight:700}
.tk-live i{width:7px;height:7px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 8px rgba(255,59,92,.9);animation:tkblink 1.5s ease-in-out infinite}
@keyframes tkblink{0%,100%{opacity:1}50%{opacity:.22}}
.tk-event{font-family:'Anton','Arial Black',sans-serif;text-transform:uppercase;font-size:clamp(28px,8vw,38px);line-height:.98;color:#fff;margin:8px 0 0;text-shadow:0 2px 0 rgba(0,0,0,.4)}
.tk-tier{display:inline-block;font-family:'Permanent Marker',cursive;font-size:15px;color:#111;background:#21C7E6;border:2px solid #111;border-radius:6px;padding:4px 12px;transform:rotate(-5deg);box-shadow:3px 3px 0 rgba(0,0,0,.5);margin:11px 0 1px}
.tk-tier.gold{background:#FFD400}
.tk-meta{font-size:12.5px;color:#d9d9de;margin-top:10px;letter-spacing:.02em}
.tk-issued{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:12px}
.tk-lbl{font-size:8.5px;letter-spacing:.24em;color:#8a8a92;text-transform:uppercase;font-weight:700;margin-bottom:3px}
.tk-holder{font-weight:700;font-size:16px;color:#fff;text-transform:uppercase;letter-spacing:.04em}
.tk-pos{font-size:10px;font-weight:700;letter-spacing:.16em;color:#21C7E6;border:1px solid rgba(33,199,230,.65);border-radius:999px;padding:4px 10px;white-space:nowrap}
.tk-perf{position:relative;height:0;border-top:2px dashed rgba(255,255,255,.32);margin:8px 0 0}
.tk-perf i{position:absolute;top:-14px;width:26px;height:26px;border-radius:50%;background:#0c0c0c}
.tk-perf i.l{left:-13px}.tk-perf i.r{right:-13px}
.tk-stub{display:flex;align-items:center;gap:16px;padding:14px 20px 8px}
.tk-admit{writing-mode:vertical-rl;transform:rotate(180deg);font-family:'Bungee',cursive;font-size:13px;letter-spacing:.3em;color:#FFD400;text-transform:uppercase;flex:none;align-self:stretch;display:flex;align-items:center;justify-content:center}
.tk-qrwrap{flex:1;display:flex;flex-direction:column;align-items:center}
.tk-qr{background:#fff;border-radius:14px;padding:10px;width:min(44vw,200px);box-shadow:0 0 0 1px rgba(255,255,255,.12),0 10px 30px rgba(0,0,0,.45)}
.tk-qr svg{display:block;width:100%;height:auto}
.tk-scan{font-size:8.5px;letter-spacing:.28em;color:#8a8a92;text-transform:uppercase;font-weight:700;margin-top:8px}
.tk-code{text-align:center;font-family:ui-monospace,SFMono-Regular,'Courier New',monospace;font-size:14px;letter-spacing:.16em;color:#FFD400;padding:4px 16px 12px;word-break:break-all}
.tk-foot{border-top:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);padding:10px 20px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.tk-slogan{font-family:'Permanent Marker',cursive;font-size:12.5px;color:#FFD400;white-space:nowrap}
.tk-biz{font-size:9.5px;color:#9a9aa2;text-align:right;line-height:1.55}
.tk-dim{filter:saturate(.5) brightness(.82)}
.tk-blur{filter:blur(7px);pointer-events:none;user-select:none}
.tk-stamp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-12deg);z-index:6;border:4px solid #ff3b3b;color:#ff4b4b;border-radius:10px;padding:10px 20px;text-align:center;background:rgba(12,12,12,.74);box-shadow:0 0 0 2px rgba(0,0,0,.35);white-space:nowrap}
.tk-stamp b{font-family:'Anton','Arial Black',sans-serif;font-size:27px;letter-spacing:.1em;display:block}
.tk-stamp span{font-size:11px;font-weight:700;letter-spacing:.08em}
.tk-pending{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:22px}
.tk-pending>div{border:3px solid #FFD400;border-radius:14px;background:rgba(12,12,12,.9);padding:18px 20px;text-align:center;max-width:290px}
.tk-pending b{font-family:'Anton','Arial Black',sans-serif;font-size:22px;letter-spacing:.05em;color:#FFD400;display:block;text-transform:uppercase}
.tk-pending p{font-size:12.5px;color:#d9d9de;line-height:1.6;margin:8px 0 0}
.tk-links{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;justify-content:center}
.tk-links a{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fff;text-decoration:none;border:2px solid rgba(255,255,255,.35);border-radius:999px;padding:8px 14px}
.tk-links a:hover{border-color:#FFD400;color:#FFD400}
.tk-comp{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#111;background:#FFD400;border-radius:999px;padding:4px 10px;margin-top:6px}
@media (prefers-reduced-motion:reduce){.tk-card::after{animation:none;display:none}.tk-live i{animation:none}}
@media print{
  body{background:#fff !important;overflow:visible}
  .tk-stage{position:static;overflow:visible;background:#fff;min-height:0;padding:12px;color:#111}
  .tk-links{display:none}
  .tk-edge{box-shadow:none;margin:0 auto}
  .tk-card::after{animation:none;display:none}
  .tk-live i{animation:none}
  .tk-perf i{background:#fff}
  .tk-card,.tk-edge{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw || '').toUpperCase();
  if (!codeAuthentic(code)) notFound();

  let t: Awaited<ReturnType<typeof getTicket>> = null;
  try {
    t = await getTicket(code);
  } catch {
    t = null;
  }
  if (!t) notFound();

  const paid = t.order_status === 'paid' || t.order_status === 'fulfilled';
  const used = !!t.used_at;
  const meta = EVENT_META[t.event_id];
  const evName = eventName(t.event_id);
  const vip = /vip/i.test(t.tier_name);
  const qrSvg = await QRCode.toString(`${SITE}/t/${code}`, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#111111', light: '#ffffff' },
  });

  return (
    <div className="tk-stage">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="tk-mid">
      <div className="tk-edge">
        <article className="tk-card" aria-label={`Urban Gang Tour e-ticket ${code}`}>
          <div className={!paid ? 'tk-blur' : used ? 'tk-dim' : undefined}>
            <div className="tk-top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/ugt-logo-v2.png" alt="Urban Gang Tour" />
              <span className="tk-ppp">PPP TV KENYA</span>
            </div>
            <div className="tk-rule" />
            <div className="tk-body">
              <span className="tk-live"><i /> UGT LIVE &middot; OFFICIAL E-TICKET</span>
              {t.pay_method === 'comp' ? <div><span className="tk-comp">Complimentary ticket</span></div> : null}
              <h1 className="tk-event">{evName}</h1>
              <div>
                <span className={'tk-tier' + (vip ? ' gold' : '')}>{t.tier_name}</span>
              </div>
              <div className="tk-meta">
                {meta
                  ? <>{meta.date} &middot; {meta.time} &middot; {meta.venue} &middot; {meta.city}</>
                  : <>Date &amp; venue announced on urbangangtour.co.ke</>}
              </div>
              <div className="tk-issued">
                <div>
                  <div className="tk-lbl">Issued to</div>
                  <div className="tk-holder">{t.holder || 'Ticket Holder'}</div>
                </div>
                <span className="tk-pos">{t.position} OF {t.of_count}</span>
              </div>
            </div>
            <div className="tk-perf"><i className="l" /><i className="r" /></div>
            <div className="tk-stub">
              <span className="tk-admit">Admit One</span>
              <div className="tk-qrwrap">
                <div className="tk-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                <span className="tk-scan">Scan at gate</span>
              </div>
            </div>
            <div className="tk-code">{code}</div>
            <div className="tk-foot">
              <span className="tk-slogan">From Potential to Purpose</span>
              <span className="tk-biz">urbangangtour.co.ke<br />+254 799 886247</span>
            </div>
          </div>
          {used ? (
            <div className="tk-stamp" role="status">
              <b>ADMITTED</b>
              <span>{eatStamp(new Date(t.used_at as any))}</span>
            </div>
          ) : null}
          {!paid ? (
            <div className="tk-pending" role="status">
              <div>
                <b>Pending payment</b>
                <p>This ticket activates the moment payment is confirmed. If you just paid, refresh in a few seconds.</p>
              </div>
            </div>
          ) : null}
        </article>
      </div>
      <div className="tk-links">
        <a href={`/api/tickets/${encodeURIComponent(code)}/pdf`}>Download PDF</a>
        <a href={`/tickets/${encodeURIComponent(t.order_id)}`}>All tickets in this order</a>
        <a href={`/receipt/${encodeURIComponent(t.order_id)}`}>Receipt</a>
      </div>
      </div>
    </div>
  );
}
