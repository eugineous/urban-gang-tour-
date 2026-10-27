'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {organizerAuthMessages,type CustomerIssue,factoryIssue,safeIssue} from '@/ui/i18n/catalogues/organizer-auth';

import {GoogleSignIn} from '@/app/_components/GoogleSignIn';
import { useState } from 'react';
import { shell, wrap, card, btnMagenta, inp, label, h1, api, useToast, Toast } from '../ui';

const ERR: Record<string, CustomerIssue> = {
  wrong_credentials: {"key":"copy.wrong_email_or_password"},
  application_pending: {"key":"copy.your_application_is_still_under_review_we_ll_email_you_once"},
  application_rejected: {"key":"copy.your_application_was_not_approved_contact_admin_urbangangtour_co_ke_for"},
  account_suspended: {"key":"copy.your_organizer_account_is_suspended_contact_admin_urbangangtour_co_ke"},
  too_many_requests: {"key":"copy.too_many_attempts_wait_a_minute_and_try_again"},
};

export default function LoginForm() {
 const t=useMessages(organizerAuthMessages);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast<CustomerIssue>();

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api('/api/organizer/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (data.ok) window.location.href = '/organizer/dashboard';
      else say(safeIssue(ERR,data.error,data.error==='Connection failed. Please try again.'?factoryIssue('Login could not connect. Please try again.'):factoryIssue('Request failed. Please try again.')));
    } finally { setBusy(false); }
  };

  return (
    <div style={shell}>
      <div style={{ ...wrap, maxWidth: 420 }}>
        <Toast msg={toast} />
        <h1 style={h1}>{t("copy.organizer_login")}</h1>
        <div style={card}><GoogleSignIn endpoint="/api/organizer/google" onSuccess={()=>{window.location.href='/organizer/dashboard'}}/>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor="org-login-email" style={label}>{t("copy.email")}</label>
              <input id="org-login-email" style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="email" />
            </div>
            <div>
              <label htmlFor="org-login-password" style={label}>{t("copy.password")}</label>
              <input id="org-login-password" style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="current-password" />
            </div>
            <button style={btnMagenta} disabled={busy} onClick={submit}>{busy ? t("copy.signing_in") : t("copy.log_in")}</button>
            <div style={{ fontSize: 12, color: '#888' }}>{t("copy.no_account_yet")} <a href="/organizer/signup" style={{ color: '#E6218C', fontWeight: 700 }}>{t("copy.apply_to_sell_tickets")}</a> · <a href="/organizer/forgot" style={{ color: '#E6218C', fontWeight: 700 }}>{t("copy.forgot_password")}</a></div>
          </div>
        </div>
      </div>
    </div>
  );
}
