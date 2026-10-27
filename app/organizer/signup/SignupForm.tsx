'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {organizerAuthMessages,type CustomerIssue,factoryIssue} from '@/ui/i18n/catalogues/organizer-auth';

import { useEffect, useState } from 'react';
import { shell, wrap, card, btnMagenta, inp, label, h1, api, useToast, Toast } from '../ui';

interface Bank { name: string; code: string; currency: string }

export default function SignupForm() {
 const t=useMessages(organizerAuthMessages);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankError, setBankError] = useState<CustomerIssue|null>(null);
  const [bankAttempt, setBankAttempt] = useState(0);
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
  const [toast, say] = useToast<CustomerIssue>();

  useEffect(() => { setBankError(null);api('/api/organizer/banks').then(({ status,data }) => {if(status===200 && Array.isArray(data.banks))setBanks(data.banks);else setBankError({"key":"copy.could_not_load_payout_banks_please_retry"});}); }, [bankAttempt]);

  const submit = async () => {
    if (!adultConfirmed || !termsAccepted) return say({"key":"copy.confirm_adult_authority_and_accept_the_terms_before_applying"});
    if (businessName.trim().length < 2) return say({"key":"copy.business_name_is_required"});
    if (contactName.trim().length < 2) return say({"key":"copy.contact_name_is_required"});
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say({"key":"copy.enter_a_valid_email"});
    if (!phone.trim()) return say({"key":"copy.phone_is_required"});
    if (password.length < 8) return say({"key":"copy.password_must_be_at_least_8_characters"});
    if (!settlementBank) return say({"key":"copy.select_your_payout_bank"});
    if (!settlementAccount.trim()) return say({"key":"copy.enter_your_bank_account_number"});
    setBusy(true);
    const { data } = await api('/api/organizer/signup', {
      method: 'POST',
      body: JSON.stringify({ businessName, contactName, email, phone, password, settlementBank, settlementAccount, adultConfirmed, termsAccepted }),
    });
    setBusy(false);
    if (data.ok) setDone(true);
    else say(factoryIssue('Request failed. Please try again.'));
  };

  if (done) {
    return (
      <div style={shell}><div style={wrap}>
        <div style={card}>
          <h1 style={{ ...h1, color: '#111' }}>{t("copy.application_received")}</h1>
          <p style={{ color: '#333', lineHeight: 1.6 }}>
            <span lang="en-KE">Thanks — your application to sell tickets through the Urban Gang Tour Marketplace is now under review.
            We&apos;ll email </span><b>{email}</b> <span lang="en-KE">once a decision is made. Once approved you can</span>{' '}
            <a href="/organizer/login" style={{ color: '#ad1264', fontWeight: 700 }}>{t("copy.log_in_here")}</a> <span lang="en-KE">and submit your first event.
          </span></p>
        </div>
      </div></div>
    );
  }

  return (
    <div style={shell}>
      <div style={wrap}>
        <Toast msg={toast} />
        <h1 style={h1}>{t("copy.sell_tickets_through_ugt")}</h1>
        <p style={{ color: '#555', marginBottom: 20, maxWidth: 560 }}>
          <span lang="en-KE">Apply to sell your event tickets through Urban Gang Tour. We review every application.
          Card payments only; our commission is deducted before automatic bank payouts.
        </span></p>
        <div style={card}>
          <form onSubmit={event=>{event.preventDefault();void submit()}} style={{ display: 'grid', gap: 12 }} aria-label={t("copy.apply_to_sell_tickets")}>
            <div>
              <label htmlFor="org-business-name" style={label}>{t("copy.business_organizer_name")}</label>
              <input id="org-business-name" name="businessName" style={inp} required minLength={2} maxLength={200} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Nairobi Live Events" autoComplete="organization" />
            </div>
            <div>
              <label htmlFor="org-contact-name" style={label}>{t("copy.contact_person")}</label>
              <input id="org-contact-name" name="contactName" style={inp} required minLength={2} maxLength={200} value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="org-email" style={label}>{t("copy.email_2")}</label>
                <input id="org-email" name="email" style={inp} required maxLength={254} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label htmlFor="org-phone" style={label}>{t("copy.phone")}</label>
                <input id="org-phone" name="phone" style={inp} required type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" autoComplete="tel" />
              </div>
            </div>
            <div>
              <label htmlFor="org-password" style={label}>{t("copy.password_min_8_characters")}</label>
              <input id="org-password" name="password" style={inp} required minLength={8} maxLength={200} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div style={{ borderTop: '1px dashed #ccc', paddingTop: 12, marginTop: 4 }}>
              {bankError&&<div><p role="alert">{bankError?t(bankError.key,bankError.values):null}</p><button type="button" style={btnMagenta} onClick={()=>setBankAttempt(n=>n+1)}>{t("copy.retry_bank_list")}</button></div>}
              <span style={{ ...label, marginBottom: 8 }}>{t("copy.payout_details_where_we_send_your_share_automatically_per_sale")}</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="org-bank" style={label}>{t("copy.payout_bank")}</label>
                  <select id="org-bank" name="settlementBank" style={inp} required value={settlementBank} onChange={(e) => setSettlementBank(e.target.value)}>
                    <option value="">{t("copy.select_bank")}</option>
                    {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="org-account" style={label}>{t("copy.bank_account_number")}</label>
                  <input id="org-account" name="settlementAccount" style={inp} required maxLength={100} value={settlementAccount} onChange={(e) => setSettlementAccount(e.target.value)} autoComplete="off" />
                </div>
              </div>
            </div>
            <label className="ugt-account-consent"><input name="adultConfirmed" type="checkbox" required checked={adultConfirmed} onChange={e => setAdultConfirmed(e.target.checked)} />{t("copy.i_am_18_or_older_and_authorised_to_apply_for_this")}</label>
            <label className="ugt-account-consent"><input name="termsAccepted" type="checkbox" required checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} /><span>{t("copy.i_accept_the")} <a href="/terms">{t("copy.terms_2")}</a> {t("copy.and_have_read_the")} <a href="/privacy-policy">{t("copy.privacy_policy_3")}</a>{t("copy.")}</span></label>
            <button type="submit" style={{ ...btnMagenta, marginTop: 8 }} disabled={busy}>{busy ? t("copy.submitting") : t("copy.apply_to_sell_tickets")}</button>
            <div style={{ fontSize: 12, color: '#595959' }}>{t("copy.already_approved")} <a href="/organizer/login" style={{ color: '#ad1264', fontWeight: 700 }}>{t("copy.log_in")}</a></div>
          </form>
        </div>
      </div>
    </div>
  );
}
