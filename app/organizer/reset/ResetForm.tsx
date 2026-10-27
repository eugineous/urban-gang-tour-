'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {organizerAuthMessages,type CustomerIssue,factoryIssue,safeIssue} from '@/ui/i18n/catalogues/organizer-auth';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { shell, wrap, card, btnMagenta, inp, label, h1, api, useToast, Toast } from '../ui';

const ERR: Record<string, CustomerIssue> = {
  invalid_token: {"key":"copy.this_reset_link_is_invalid_or_has_already_been_used"},
  token_expired: {"key":"copy.this_reset_link_has_expired_request_a_fresh_one"},
  too_many_requests: {"key":"copy.too_many_attempts_wait_a_minute_and_try_again"},
};

export default function ResetForm() {
 const t=useMessages(organizerAuthMessages);
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, say] = useToast<CustomerIssue>();

  const submit = async () => {
    if (busy) return;
    if (password.length < 8) { say({"key":"copy.password_must_be_at_least_8_characters_2"}); return; }
    setBusy(true);
    try {
      const { data } = await api('/api/organizer/reset', { method: 'POST', body: JSON.stringify({ token, password }) });
      if (data.ok) setDone(true);
      else say(safeIssue(ERR,data.error,data.error==='Connection failed. Please try again.'?factoryIssue('Login could not connect. Please try again.'):factoryIssue('Request failed. Please try again.')));
    } finally { setBusy(false); }
  };

  return (
    <div style={shell}>
      <div style={{ ...wrap, maxWidth: 420 }}>
        <Toast msg={toast} />
        <h1 style={h1}>{t("copy.set_a_new_password")}</h1>
        <div style={card}>
          {!token ? (
            <p style={{ lineHeight: 1.6 }}>{t("copy.this_page_needs_a_reset_link_request_one_from_the")} <a href="/organizer/forgot" style={{ color: '#E6218C', fontWeight: 700 }}>{t("copy.forgot_password_page")}</a>{t("copy.")}</p>
          ) : done ? (
            <p style={{ lineHeight: 1.6 }}>{t("copy.password_updated_every_other_session_is_signed_out")} <a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>{t("copy.log_in")}</a>{t("copy.")}</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label htmlFor="org-reset-password" style={label}>{t("copy.new_password_min_8_characters")}</label>
                <input id="org-reset-password" style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="new-password" />
              </div>
              <button style={btnMagenta} disabled={busy} onClick={submit}>{busy ? t("copy.saving") : t("copy.set_new_password")}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
