'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {organizerAuthMessages,type CustomerIssue,factoryIssue} from '@/ui/i18n/catalogues/organizer-auth';

import { useState } from 'react';
import { shell, wrap, card, btnMagenta, inp, label, h1, api, useToast, Toast } from '../ui';

export default function ForgotForm() {
 const t=useMessages(organizerAuthMessages);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, say] = useToast<CustomerIssue>();

  const submit = async () => {
    setBusy(true);
    const { data } = await api('/api/organizer/forgot', { method: 'POST', body: JSON.stringify({ email }) });
    setBusy(false);
    if (data.ok) setSent(true);
    else say(factoryIssue('Request failed. Please try again.'));
  };

  return (
    <div style={shell}>
      <div style={{ ...wrap, maxWidth: 420 }}>
        <Toast msg={toast} />
        <h1 style={h1}>{t("copy.reset_password")}</h1>
        <div style={card}>
          {sent ? (
            <p style={{ lineHeight: 1.6 }}>{t("copy.if_that_address_belongs_to_an_organizer_account_a_reset_link")}</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label htmlFor="org-forgot-email" style={label}>{t("copy.account_email")}</label>
                <input id="org-forgot-email" style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="email" />
              </div>
              <button style={btnMagenta} disabled={busy} onClick={submit}>{busy ? t("copy.sending") : t("copy.send_reset_link")}</button>
              <div style={{ fontSize: 12, color: '#888' }}><a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>{t("copy.back_to_login")}</a></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
