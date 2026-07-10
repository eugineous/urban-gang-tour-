'use client';

// Admin landing cards, fed by one aggregate endpoint (view=dashboard):
// money outstanding, the next event and its checklist progress, follow-ups
// due today, the live promo, pending reviews and the latest audit entries.

import { useEffect, useState } from 'react';
import {
  OC, card, h3, Chip, fmtKES, fmtDate, opsGet, waLink,
} from './ui';

export default function OpsDashboard() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    opsGet('dashboard').then(({ data }) => {
      if (data.error) setErr(data.error); else setD(data);
    });
  }, []);

  if (err) return <div style={{ ...card, fontSize: 13 }}>Ops dashboard unavailable: {err}</div>;
  if (!d) return <div style={{ ...card, fontSize: 13 }}>Loading ops overview...</div>;

  const ne = d.nextEvent;
  const daysOut = ne?.event_date ? Math.max(0, Math.ceil((new Date(fmtDate(ne.event_date)).getTime() - Date.now()) / 86400000)) : null;
  const clTotal = Number(ne?.checklist_total || 0);
  const clDone = Number(ne?.checklist_done || 0);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 26, color: d.outstanding > 0 ? OC.orange : OC.green }}>{fmtKES(d.outstanding)}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Outstanding on invoices</div>
          <div style={{ marginTop: 6 }}>
            <Chip text={`${d.overdueCount} overdue`} bg={d.overdueCount ? '#FBE9E7' : '#E7F5EE'} color={d.overdueCount ? OC.red : OC.green} />
          </div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          {ne ? (
            <>
              <div style={{ fontFamily: 'Anton', fontSize: 20 }}>{ne.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{ne.school}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <b>{fmtDate(ne.event_date)}</b>{daysOut !== null && <span style={{ color: OC.magenta, fontWeight: 800 }}> - {daysOut} day{daysOut === 1 ? '' : 's'} out</span>}
              </div>
              <div style={{ marginTop: 6 }}>
                <Chip text={clTotal ? `checklist ${clDone}/${clTotal}` : 'no checklist yet'} bg={clTotal && clDone === clTotal ? '#E7F5EE' : '#FDF2D9'} color={clTotal && clDone === clTotal ? OC.green : OC.orange} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'Anton', fontSize: 20, color: '#999' }}>No upcoming event</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Confirm a lead in the Pipeline, then budget it.</div>
            </>
          )}
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700, marginTop: 8 }}>Next event</div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 26, color: d.followups?.length ? OC.orange : OC.green }}>{d.followups?.length || 0}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Follow-ups due</div>
          <div style={{ marginTop: 6, display: 'grid', gap: 4, textAlign: 'left' }}>
            {(d.followups || []).slice(0, 3).map((f: any) => (
              <div key={f.id} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                <b>{f.name}</b><span style={{ color: '#888' }}>{f.org}</span>
                {f.phone && <a href={waLink(f.phone)} target="_blank" rel="noopener" style={{ color: OC.green, fontWeight: 700 }}>wa</a>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          {d.activePromo ? (
            <>
              <div style={{ fontFamily: 'Anton', fontSize: 20 }}>{d.activePromo.name}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <b style={{ color: OC.magenta }}>{d.activePromo.promo_type === 'percent' ? `${Number(d.activePromo.discount)}% off` : `KES ${Number(d.activePromo.discount).toLocaleString()} off`}</b>
                {d.activePromo.code ? <span> - code {d.activePromo.code}</span> : null}
              </div>
              {d.activePromo.ends_on && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>ends {fmtDate(d.activePromo.ends_on)}</div>}
            </>
          ) : (
            <div style={{ fontFamily: 'Anton', fontSize: 20, color: '#999' }}>No active promo</div>
          )}
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700, marginTop: 8 }}>Active promo</div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 26, color: d.pendingReviews ? OC.orange : OC.green }}>{d.pendingReviews}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Reviews awaiting moderation</div>
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>RECENT ACTIVITY</h3>
        {(d.audit || []).map((a: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '4px 0', borderBottom: '1px solid #eee', flexWrap: 'wrap' }}>
            <span style={{ color: '#888', minWidth: 78 }}>{fmtDate(a.created_at)}</span>
            <b>{a.action}</b>
            <span style={{ color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>{typeof a.detail === 'string' ? a.detail : JSON.stringify(a.detail || {})}</span>
          </div>
        ))}
        {!(d.audit || []).length && <div style={{ fontSize: 13, color: '#666' }}>No ops activity logged yet.</div>}
      </div>
    </div>
  );
}
