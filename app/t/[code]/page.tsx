import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { codeAuthentic, getTicket, getEventMeta, getEventName } from '@/lib/server/tickets';
import { getMarketplaceEventById } from '@/lib/server/marketplace';

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
.tk-stage{min-height:100svh;padding:24px 16px 48px;background:#f4f4f4;color:#151515;font-family:Inter,system-ui,sans-serif}.tk-mid{width:min(460px,100%);margin:auto}.tk-card{position:relative;background:white;border:1px solid #d6cbd1;border-radius:24px;overflow:hidden}.tk-top{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;gap:12px}.tk-top img{width:72px;height:48px;object-fit:contain}.tk-rule{height:4px;background:#a81561}.tk-body{padding:24px}.tk-live,.tk-lbl{font-size:12px;line-height:1.5;color:#686268}.tk-event{font-size:clamp(28px,7vw,40px);letter-spacing:-.04em;line-height:1.12;overflow-wrap:anywhere;margin:12px 0}.tk-tier,.tk-comp{display:inline-block;padding:6px 12px;background:#f7e8ef;color:#86104f;font-size:15px;border-radius:8px}.tk-tier.gold,.tk-comp{background:#fff0b0;color:#534300}.tk-meta{font-size:16px;line-height:1.6;margin-top:16px}.tk-issued{display:flex;justify-content:space-between;align-items:start;gap:16px;margin-top:24px}.tk-holder{font-size:20px;font-weight:600;overflow-wrap:anywhere}.tk-pos{font-size:13px;white-space:nowrap;padding-top:6px}.tk-perf{border-top:1px dashed #c8bdc3}.tk-stub{padding:24px;display:flex;align-items:center;justify-content:center;gap:20px}.tk-admit{writing-mode:vertical-rl;transform:rotate(180deg);font-size:14px;font-weight:600;color:#86104f}.tk-qrwrap{display:flex;flex-direction:column;align-items:center;gap:8px}.tk-qr{width:min(210px,56vw);background:#fff}.tk-qr svg{display:block;width:100%;height:auto}.tk-scan{font-size:14px;color:#686268}.tk-code{font:14px/1.6 ui-monospace,monospace;text-align:center;overflow-wrap:anywhere;padding:0 24px 24px}.tk-foot{background:#f7f2f5;padding:16px 24px;display:flex;gap:16px;justify-content:space-between;align-items:center;font-size:12px;line-height:1.6}.tk-slogan{color:#86104f}.tk-biz{text-align:right;color:#686268}.tk-links{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:24px}.tk-links a{display:flex;align-items:center;justify-content:center;min-height:48px;padding:12px 16px;background:#fff;border:1px solid #d6cbd1;border-radius:12px;color:#86104f;font-size:15px}.tk-links a:hover{background:#f7e8ef}.tk-links a:focus-visible{outline:3px solid #21c7e6;outline-offset:3px}.tk-dim{opacity:.55}.tk-blur{filter:blur(7px);pointer-events:none;user-select:none}.tk-stamp{position:absolute;top:45%;inset-inline:20px;border:2px solid #a61925;color:#a61925;background:white;padding:20px;text-align:center;border-radius:12px;display:grid;gap:8px}.tk-stamp b{font-size:30px}.tk-stamp span{font-size:15px}.tk-pending{position:absolute;inset:0;display:grid;place-items:center;padding:20px}.tk-pending>div{background:#fff;border:1px solid #d6cbd1;border-radius:16px;padding:24px;text-align:center}.tk-pending b{font-size:24px}.tk-pending p{font-size:16px;line-height:1.6;margin-top:12px}@media(max-width:280px){.tk-body,.tk-stub,.tk-top,.tk-foot{padding:18px}.tk-issued,.tk-foot{flex-wrap:wrap}.tk-event{font-size:28px}.tk-links a{width:100%}}@media print{.tk-stage{padding:0;background:#fff;min-height:0}.tk-card{break-inside:avoid}.tk-links{display:none}.tk-rule,.tk-tier,.tk-foot{print-color-adjust:exact}}
`;

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
  const meta = await getEventMeta(t.event_id, t.marketplace_event_id);
  const evName = await getEventName(t.event_id, t.marketplace_event_id);
  // Third-party marketplace tickets carry the organizer's name so a buyer is
  // never confused about who is actually running the show — UGT only
  // processed the payment (see CLAUDE.md marketplace trust/liability note).
  const presentedBy = t.marketplace_event_id
    ? (await getMarketplaceEventById(t.marketplace_event_id))?.organizer_business_name || null
    : null;
  const vip = /vip/i.test(t.tier_name);
  const qrSvg = await QRCode.toString(`${SITE}/verify/ticket/${code}`, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 4,
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
              <img src="/assets/ugt-logo.png" alt="Urban Gang Tour" />
              <span className="tk-lbl">Official e-ticket</span>
            </div>
            <div className="tk-rule" />
            <div className="tk-body">
              <span className="tk-live">Your entry pass</span>
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
              {presentedBy ? <div className="tk-meta">Presented by {presentedBy} &middot; ticketed via UGT Marketplace</div> : null}
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
