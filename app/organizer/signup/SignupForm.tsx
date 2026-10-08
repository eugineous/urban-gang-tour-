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
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, say] = useToast();

  useEffect(() => { api('/api/organizer/banks').then(({ data }) => setBanks(data.banks || [])); }, []);

  const submit = async () => {
    if (!adultConfirmed || !termsAccepted) return say('Confirm adult authority and accept the terms before applying.');
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
      body: JSON.stringify({ businessName, contactName, email, phone, password, settlementBank, settlementAccount, adultConfirmed, termsAccepted }),
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
            <div>
              <label htmlFor="org-business-name" style={label}>Business / organizer name *</label>
              <input id="org-business-name" style={inp} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Nairobi Live Events" autoComplete="organization" />
            </div>
            <div>
              <label htmlFor="org-contact-name" style={label}>Contact person *</label>
              <input id="org-contact-name" style={inp} value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="org-email" style={label}>Email *</label>
                <input id="org-email" style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label htmlFor="org-phone" style={label}>Phone *</label>
                <input id="org-phone" style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" autoComplete="tel" />
              </div>
            </div>
            <div>
              <label htmlFor="org-password" style={label}>Password (min 8 characters) *</label>
              <input id="org-password" style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div style={{ borderTop: '1px dashed #ccc', paddingTop: 12, marginTop: 4 }}>
              <span style={{ ...label, marginBottom: 8 }}>Payout details — where we send your share automatically per sale</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="org-bank" style={label}>Settlement bank *</label>
                  <select id="org-bank" style={inp} value={settlementBank} onChange={(e) => setSettlementBank(e.target.value)}>
                    <option value="">Select bank...</option>
                    {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="org-account" style={label}>Account number *</label>
                  <input id="org-account" style={inp} value={settlementAccount} onChange={(e) => setSettlementAccount(e.target.value)} autoComplete="off" />
                </div>
              </div>
            </div>
            <label className="ugt-account-consent"><input type="checkbox" checked={adultConfirmed} onChange={e => setAdultConfirmed(e.target.checked)} />I am 18 or older and authorised to apply for this business.</label>
            <label className="ugt-account-consent"><input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} /><span>I accept the <a href="/terms">Terms</a> and have read the <a href="/privacy-policy">Privacy Policy</a>.</span></label>
            <button style={{ ...btnMagenta, marginTop: 8 }} disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Apply to sell tickets'}</button>
            <div style={{ fontSize: 12, color: '#888' }}>Already approved? <a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>Log in</a></div>
          </div>
        </div>
      </div>
    </div>
  );
}
