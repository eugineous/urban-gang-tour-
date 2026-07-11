'use client';

// Shop promos: name, percent-or-fixed discount, product ids, run dates,
// banner text, code, max uses. Enforced server-side on every checkout route
// (M-Pesa/STK, Paystack, Stripe) via lib/server/catalog.ts serverTotalWithPromos()
// - see lib/server/promos.ts for the discount rules.

import { useCallback, useEffect, useState } from 'react';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, td, th,
  Chip, fmtDate, opsGet, opsPost, Toast, useToast, NumInput,
} from './ui';

interface Promo {
  id: number; name: string; promo_type: 'percent' | 'fixed'; discount: number;
  product_ids: string[]; starts_on: string | null; ends_on: string | null;
  banner_text: string; code: string; max_uses: number | null; uses: number; active: boolean;
}

const EMPTY = {
  id: null as number | null, name: '', promoType: 'percent' as 'percent' | 'fixed', discount: 10,
  productIdsText: '', startsOn: '', endsOn: '', bannerText: '', code: '', maxUses: null as number | null, active: true,
};

export default function Promos() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet('promos');
    if (data.error) say('Load failed: ' + data.error);
    else setRows((data.rows || []).map((r: any) => ({ ...r, product_ids: typeof r.product_ids === 'string' ? JSON.parse(r.product_ids) : r.product_ids || [] })));
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!edit || !edit.name.trim()) { say('Name is required'); return; }
    setBusy(true);
    const { data } = await opsPost('promo.save', {
      id: edit.id, name: edit.name, promoType: edit.promoType, discount: edit.discount,
      productIds: edit.productIdsText.split(',').map((s) => s.trim()).filter(Boolean),
      startsOn: edit.startsOn || null, endsOn: edit.endsOn || null,
      bannerText: edit.bannerText, code: edit.code, maxUses: edit.maxUses, active: edit.active,
    });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say('Saved');
    setEdit(null);
    reload();
  };

  const today = new Date().toISOString().slice(0, 10);
  const isLive = (p: Promo) => p.active && (!p.starts_on || fmtDate(p.starts_on) <= today) && (!p.ends_on || fmtDate(p.ends_on) >= today);

  if (edit) {
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? 'EDIT PROMO' : 'NEW PROMO'}</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div><span style={label}>Name *</span><input style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Back to school" /></div>
          <div><span style={label}>Type</span>
            <select style={inp} value={edit.promoType} onChange={(e) => setEdit({ ...edit, promoType: e.target.value as 'percent' | 'fixed' })}>
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed KES off</option>
            </select>
          </div>
          <div><span style={label}>{edit.promoType === 'percent' ? 'Discount (%)' : 'Discount (KES)'}</span>
            <input style={inp} type="number" min={0} value={edit.discount} onChange={(e) => setEdit({ ...edit, discount: Number(e.target.value) || 0 })} />
          </div>
          <div><span style={label}>Code (optional)</span><input style={inp} value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="UGT10" /></div>
          <div><span style={label}>Starts</span><input style={inp} type="date" value={edit.startsOn} onChange={(e) => setEdit({ ...edit, startsOn: e.target.value })} /></div>
          <div><span style={label}>Ends</span><input style={inp} type="date" value={edit.endsOn} onChange={(e) => setEdit({ ...edit, endsOn: e.target.value })} /></div>
          <div><span style={label}>Max uses (empty = unlimited)</span><NumInput value={edit.maxUses} onChange={(v) => setEdit({ ...edit, maxUses: v })} min={0} placeholder="unlimited" /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Product ids (comma separated; empty = whole shop)</span>
          <input style={inp} value={edit.productIdsText} onChange={(e) => setEdit({ ...edit, productIdsText: e.target.value })} placeholder="tee-classic, hoodie-tour" />
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Banner text (shown on the shop when live)</span>
          <input style={inp} value={edit.bannerText} onChange={(e) => setEdit({ ...edit, bannerText: e.target.value })} placeholder="10% off all tour tees this week!" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13 }}>
          <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>Save promo</button>
          <button style={btnDark} onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>SHOP PROMOS</h3>
          <div style={{ flex: 1 }} />
          <button style={btn} onClick={() => setEdit({ ...EMPTY })}>+ New promo</button>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          Live: promos here are enforced on every shop checkout (M-Pesa, Paystack, card). A promo with no code applies automatically to its eligible products; a promo with a code only applies when the buyer enters that code at checkout, and never stacks with an automatic promo (best discount per item wins).
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{['name', 'discount', 'code', 'products', 'window', 'uses', 'status', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td style={td}><b>{p.name}</b>{p.banner_text ? <div style={{ fontSize: 11, color: '#888' }}>{p.banner_text}</div> : null}</td>
                  <td style={td}><b>{p.promo_type === 'percent' ? `${Number(p.discount)}%` : `KES ${Number(p.discount).toLocaleString()}`}</b></td>
                  <td style={td}>{p.code}</td>
                  <td style={td}>{p.product_ids.length ? p.product_ids.join(', ').slice(0, 60) : 'whole shop'}</td>
                  <td style={td}>{fmtDate(p.starts_on) || 'now'} to {fmtDate(p.ends_on) || 'no end'}</td>
                  <td style={td}>{p.uses}{p.max_uses != null ? ` / ${p.max_uses}` : ''}</td>
                  <td style={td}>{isLive(p) ? <Chip text="live" bg="#E7F5EE" color={OC.green} /> : p.active ? <Chip text="scheduled" bg="#FDF2D9" color={OC.orange} /> : <Chip text="off" />}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button style={btnSmall} onClick={() => setEdit({
                        id: p.id, name: p.name, promoType: p.promo_type, discount: Number(p.discount),
                        productIdsText: p.product_ids.join(', '), startsOn: fmtDate(p.starts_on), endsOn: fmtDate(p.ends_on),
                        bannerText: p.banner_text, code: p.code, maxUses: p.max_uses, active: p.active,
                      })}>Edit</button>
                      <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={async () => {
                        if (!confirm(`Delete promo "${p.name}"?`)) return;
                        const { data } = await opsPost('promo.delete', { id: p.id });
                        if (data.error) say('Failed: ' + data.error); else reload();
                      }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td style={td} colSpan={8}>No promos yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
