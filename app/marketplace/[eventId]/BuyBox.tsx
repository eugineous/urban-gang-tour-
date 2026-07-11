'use client';

import { useState } from 'react';

interface Tier { name: string; price: number }

export default function BuyBox({ eventId, tiers }: { eventId: string; tiers: Tier[] }) {
  const [tier, setTier] = useState(0);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const total = (tiers[tier]?.price || 0) * qty;

  const buy = async () => {
    setErr('');
    if (name.trim().length < 2) { setErr('Enter the ticket holder name'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, tier, qty, name, email: email || undefined }),
      });
      const data = await r.json().catch(() => ({}));
      if (data.ok && data.url) window.location.href = data.url;
      else setErr(data.error === 'card_not_configured' ? 'Card payments are not available right now.' : 'Checkout failed: ' + (data.error || 'unknown error'));
    } catch {
      setErr('Checkout failed — check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '2px solid #111', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#555', display: 'block', marginBottom: 4 };

  return (
    <div style={{ background: '#fff', color: '#111', border: '3px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', padding: 18 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <span style={label}>Ticket tier</span>
          <select style={inp} value={tier} onChange={(e) => setTier(Number(e.target.value))}>
            {tiers.map((t, i) => <option key={i} value={i}>{t.name} — KES {t.price.toLocaleString('en-KE')}</option>)}
          </select>
        </div>
        <div>
          <span style={label}>Quantity</span>
          <input style={inp} type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
        </div>
        <div>
          <span style={label}>Ticket holder name *</span>
          <input style={inp} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <span style={label}>Email (for your receipt)</span>
          <input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ fontFamily: 'Anton', fontSize: 22, marginTop: 4 }}>Total: KES {total.toLocaleString('en-KE')}</div>
        {err ? <div style={{ color: '#C0392B', fontSize: 13 }}>{err}</div> : null}
        <button
          onClick={buy}
          disabled={busy}
          style={{ background: '#E6218C', color: '#fff', fontWeight: 800, fontSize: 15, padding: '13px 18px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #111', cursor: 'pointer' }}
        >
          {busy ? 'Redirecting to payment…' : 'Pay with card'}
        </button>
        <div style={{ fontSize: 11, color: '#888' }}>Secure card checkout via Paystack. M-Pesa is not yet available for marketplace tickets.</div>
      </div>
    </div>
  );
}
