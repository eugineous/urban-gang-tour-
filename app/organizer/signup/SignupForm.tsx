'use client';

import { useEffect, useState } from 'react';
import { shell, wrap, card, btnMagenta, inp, label, h1, api, useToast, Toast } from '../ui';

interface Bank { name: string; code: string; currency: string }

export default function SignupForm() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [settlementBank, setSettlementBank] = useState('');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, say] = useToast();

  useEffect(() => { api('/api/organizer/banks').then(({ data }) => setBanks(data.banks || [])); }, []);

  const submit = async () => {
    if (businessName.trim().length < 2) return say('Business name is required');
    if (contactName.trim().length < 2) return say('Contact name is required');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say('Enter a valid email');
    if (!phone.trim()) return say('Phone is required');
    if (password.length < 8) return say('Password must be at least 8 characters');
    if (!settlementBank) return say('Select your settlement bank');
    if (!settlementAccount.trim()) return say('Enter your settlement account number');
    setBusy(true);
    const { data } = await api('/api/organizer/signup', {
      method: 'POST',
      body: JSON.stringify({ businessName, contactName, email, phone, password, settlementBank, settlementAccount }),
    });
    setBusy(false);
    if (data.ok) setDone(true);
    else say('Failed: ' + (data.error || 'unknown error'));
  };

  if (done) {
    return (
      <div style={shell}><div style={wrap}>
        <div style={card}>
          <h1 style={{ ...h1, color: '#111' }}>Application received</h1>
          <p style={{ color: '#333', lineHeight: 1.6 }}>
            Thanks — your application to sell tickets through the Urban Gang Tour Marketplace is now under review.
            We&apos;ll email <b>{email}</b> once a decision is made. Once approved you can{' '}
            <a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>log in here</a> and submit your first event.
          </p>
        </div>
      </div></div>
    );
  }

  return (
    <div style={shell}>
      <div style={wrap}>
        <Toast msg={toast} />
        <h1 style={h1}>Sell tickets through UGT</h1>
        <p style={{ color: '#bbb', marginBottom: 20, maxWidth: 560 }}>
          The Urban Gang Tour Marketplace lets any event organizer sell tickets through urbangangtour.co.ke.
          We collect the payment and pay you out automatically per ticket sold, minus our commission —
          card payments only, no manual payouts. Apply below; a UGT admin reviews every application.
        </p>
        <div style={card}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div><span style={label}>Business / organizer name *</span><input style={inp} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Nairobi Live Events" /></div>
            <div><span style={label}>Contact person *</span><input style={inp} value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><span style={label}>Email *</span><input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><span style={label}>Phone *</span><input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" /></div>
            </div>
            <div><span style={label}>Password (min 8 characters) *</span><input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div style={{ borderTop: '1px dashed #ccc', paddingTop: 12, marginTop: 4 }}>
              <span style={{ ...label, marginBottom: 8 }}>Payout details — where we send your share automatically per sale</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={label}>Settlement bank *</span>
                  <select style={inp} value={settlementBank} onChange={(e) => setSettlementBank(e.target.value)}>
                    <option value="">Select bank...</option>
                    {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
                <div><span style={label}>Account number *</span><input style={inp} value={settlementAccount} onChange={(e) => setSettlementAccount(e.target.value)} /></div>
              </div>
            </div>
            <button style={{ ...btnMagenta, marginTop: 8 }} disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Apply to sell tickets'}</button>
            <div style={{ fontSize: 12, color: '#888' }}>Already approved? <a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>Log in</a></div>
          </div>
        </div>
      </div>
    </div>
  );
}
