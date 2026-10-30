'use client';
import {formatKes} from '@/lib/i18n/format';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {accountMessages,type CustomerIssue,factoryIssue,safeIssue,statusIssue} from '@/ui/i18n/catalogues/account';
import {GoogleSignIn} from '@/app/_components/GoogleSignIn';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';

import { useEffect, useRef, useState } from 'react';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ddd4da', borderRadius: 16, boxShadow: 'none', padding: 'clamp(18px, 5vw, 28px)' };
const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '1px solid #b9acb3', borderRadius: 10, fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit' };
const btn: React.CSSProperties = { background: '#9a145d', color: '#fff', fontWeight: 600, fontSize: 16, minHeight: 48, padding: '12px 18px', border: '1px solid #ddd4da', borderRadius: 12, boxShadow: 'none', cursor: 'pointer', width: '100%' };

export default function AccountApp() {
 const t=useMessages(accountMessages);const {locale}=useInterfaceLanguage();const money=(value:number)=>formatKes(value,locale)??'';
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState('');
  const [wallet, setWallet] = useState<any>(null);
  const [walletError, setWalletError] = useState<CustomerIssue|null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [eligible, setEligible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [msg, setMsg] = useState<CustomerIssue|null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [probe, setProbe] = useState(0);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('reset');
    if (token) {
      // Keep a reset credential out of subsequent navigation/referrer URLs.
      window.history.replaceState(null, '', '/account');
      if (/^[A-Za-z0-9_-]{43}$/.test(token)) { setResetToken(token); setMode('reset'); }
      else setMsg({"key":"copy.this_reset_link_is_invalid_request_a_new_password_reset"});
    }
  }, []);
  useEffect(() => {
    setWallet(null); setWalletError(null);
    if (!user) return;
    const controller = new AbortController();
    fetchWithTimeout('/api/account', {signal:controller.signal}).then(async r => {
      if (r.status===401) {
        if (!controller.signal.aborted) { setUser(null); setMsg({"key":"copy.your_session_has_ended_sign_in_again_to_view_your_purchases"}); }
        return null;
      }
      if (!r.ok) throw new Error();
      const data=await r.json();
      if (!Array.isArray(data.orders) || !Array.isArray(data.tickets) || !Array.isArray(data.requests)) throw new Error();
      return data;
    }).then(data => { if (data && !controller.signal.aborted) setWallet(data); })
      .catch(() => { if (!controller.signal.aborted) setWalletError({"key":"copy.your_purchases_could_not_load_please_try_again"}); });
    return () => controller.abort();
  }, [user, probe]);

  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [sub, setSub] = useState({ name: '', school: '', title: '', pitch: '', sent: false });

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setSessionError(false);
    fetchWithTimeout('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me' }), signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error('session_unavailable'); return r.json(); })
      .then((d) => { if (!controller.signal.aborted) setUser(d.user || null); })
      .catch(() => { if (!controller.signal.aborted) setSessionError(true); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [probe]);

  const go = async (action: string) => {
    if (pending.current) return;
    if (action === 'forgot' || action === 'reset') {
      pending.current = true; setBusy(true); setMsg(null);
      try { const r = await fetchWithTimeout('/api/account/recovery', {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(action === 'forgot' ? {action,email:f.email} : {action,token:resetToken,password:f.password})}); const d = await r.json(); if (!r.ok) { setMsg(d.error === 'email_delivery_unavailable' ? {"key":"copy.password_emails_are_unavailable_contact_our_team_for_account_help"} : d.error === 'invalid_or_expired_token' ? {"key":"copy.this_reset_link_has_expired_or_was_already_used_request_another"} : {"key":"copy.we_could_not_complete_this_request_check_your_details_and_try"}); } else if (action === 'reset') { setUser(null); setMode('login'); setF({...f,password:''}); setMsg({"key":"copy.password_updated_sign_in_with_your_new_password"}); window.history.replaceState(null,'','/account'); } else setMsg(factoryIssue('If this email has an account, a reset link will be sent.')); } catch { setMsg({"key":"copy.check_your_connection_and_try_again"}); } finally { pending.current=false; setBusy(false); } return;
    }
    if (action === 'signup' && (!eligible || !termsAccepted)) { setMsg({"key":"copy.confirm_you_are_18_or_older_and_accept_the_terms_to"}); return; }
    pending.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetchWithTimeout('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'logout' ? { action } : { action, ...f, ...(action === 'signup' ? { adultConfirmed: eligible, termsAccepted } : {}) }) });
      const d = await r.json();
      if (r.ok && d.ok) {
        setUser(action === 'logout' ? null : d.user);
        setF({ name: '', email: '', phone: '', password: '' });
        if (action === 'logout') setSub({ name: '', school: '', title: '', pitch: '', sent: false });
      } else setMsg(safeIssue(({ account_exists: {"key":"copy.unable_to_create_this_account_try_logging_in_or_contact_us"}, wrong_credentials: {"key":"copy.check_your_email_or_phone_and_password_then_try_again"}, password_min_6: {"key":"copy.use_a_password_with_6_to_100_characters"}, invalid_email: {"key":"copy.enter_a_valid_email_address"}, need_email_or_phone: {"key":"copy.enter_your_email_or_kenyan_phone_number"}, too_many_requests: {"key":"copy.too_many_attempts_wait_a_minute_then_try_again"}, invalid_phone: {"key":"copy.use_a_kenyan_number_like_07xx_or_2547xx"}, age_confirmation_required: {"key":"copy.accounts_are_for_adults_aged_18_and_over_ask_a_parent"}, terms_required: {"key":"copy.accept_the_terms_to_create_an_account"}, accounts_unavailable: {"key":"copy.accounts_are_briefly_unavailable_try_again_shortly"} } as Record<string, CustomerIssue>),d.error,{"key":"copy.we_could_not_complete_that_request_please_try_again"}));
    } catch { setMsg({"key":"copy.check_your_connection_and_try_again_your_details_have_been_kept"}); }
    finally { pending.current = false; setBusy(false); }
  };

  const submitPitch = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const { name, school, title, pitch } = sub;
      const r = await fetchWithTimeout('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, school, title, pitch }) });
      const d = await r.json();
      if (r.ok && d.ok) setSub({ ...sub, sent: true });
      else if (r.status === 401) { setUser(null); setMsg({"key":"copy.your_session_has_ended_log_in_again_to_send_your_story"}); }
      else setMsg(r.status === 429 ? {"key":"copy.please_wait_a_minute_before_sending_again"} : {"key":"copy.your_story_was_not_sent_check_the_required_name_and_title"});
    } catch { setMsg({"key":"copy.your_story_was_not_sent_check_your_connection_and_try_again"}); }
    finally { pending.current = false; setBusy(false); }
  };

  if (checking) return <div style={card} role="status">{t("copy.checking_your_account")}</div>;
  if (sessionError) return <div style={card}><p role="alert">{t("copy.we_could_not_check_your_account_check_your_connection_and_try")}</p><button style={btn} onClick={() => setProbe(probe + 1)}>{t("copy.try_again")}</button><p><a href="/">{t("copy.back_to_the_tour")}</a></p></div>;

  if (user && mode !== 'reset') {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div style={card}>
          <h2 style={{ fontFamily: 'inherit', margin: '0 0 6px' }}>{t(factoryIssue("Welcome,").key)} {(user.name || user.email || t(factoryIssue("Member").key)).toUpperCase()}</h2>
          <div style={{ fontSize: 15, color: '#555' }}>{user.email || user.phone} <span lang="en-KE">· Your details are protected under our </span><a href="/privacy-policy" style={{ color: '#E6218C', fontWeight: 700 }}>{t("copy.privacy_policy_3")}</a>{t("copy.")}</div>
          <button style={{ ...btn, width: 'auto', marginTop: 14, background: '#111', color: '#fff' }}
            disabled={busy} onClick={() => go('logout')}>
            {busy ? t("copy.please_wait") : t("copy.log_out")}
          </button>
        </div>
        {msg && <p role="alert" style={{ ...card, color: '#a00' }}>{msg?t(msg.key,msg.values):null}</p>}
        <div style={card}><h2>{t("copy.my_orders_tickets")}</h2><p><span lang="en-KE">Purchases made while signed in appear here. Guest purchases remain in their original confirmation email.</span></p>{walletError && <p role="alert">{walletError?t(walletError.key,walletError.values):null} <button type="button" onClick={()=>{setWalletError(null);setProbe(probe+1)}}>{t("copy.retry")}</button></p>}{!wallet && !walletError && <p role="status">{t("copy.loading_your_purchases")}</p>}{wallet && wallet.orders.length===0 && <p>{t("copy.no_account_purchases_yet")} <a href="/events">{t("copy.find_an_event")}</a> {t("copy.or")} <a href="/shop">{t("copy.visit_the_shop")}</a>{t("copy.")}</p>}{wallet?.orders.map((order:any)=><article key={order.id} style={{borderTop:'1px solid #ddd',padding:'16px 0'}}><h3 style={{overflowWrap:'anywhere'}}>{order.id}</h3><p>{t(statusIssue(order.status).key)} · {money(Number(order.total))}</p><p>{new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{dateStyle:'medium',timeZone:'Africa/Nairobi'}).format(new Date(order.created_at))}</p>{['paid','fulfilled'].includes(order.status) && <span><a href={`/receipt/${encodeURIComponent(order.id)}`}>{t("copy.view_receipt")}</a> · <a href={`/orders/track?ref=${encodeURIComponent(order.id)}`}>{t("copy.track_order")}</a></span>}{wallet.tickets.filter((ticket:any)=>ticket.order_id===order.id).map((ticket:any)=><p key={ticket.code}><a href={`/api/tickets/${encodeURIComponent(ticket.code)}/pdf`}>{t("copy.download")} {ticket.tier_name} {t("copy.ticket")}</a> · {ticket.used_at?t("copy.scanned_at_gate"):t("copy.not_yet_scanned")}</p>)}</article>)}</div>
        <div style={card}>
          <h3 style={{ fontFamily: 'inherit', margin: '0 0 8px' }}>{t("copy.share_a_story_with_urban_news")}</h3>
          {sub.sent ? <div style={{ color: '#1F8A5B', fontWeight: 700 }}>{t("copy.sent_to_the_newsroom_the_crew_reviews_every_pitch")}</div> : (
            <form style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); void submitPitch(); }}>
              <label>{t("copy.your_name")}<input style={inp} required maxLength={100} autoComplete="name" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} /></label>
              <label>{t("copy.school_campus")}<input style={inp} maxLength={150} value={sub.school} onChange={(e) => setSub({ ...sub, school: e.target.value })} /></label>
              <label>{t("copy.story_title")}<input style={inp} required maxLength={150} value={sub.title} onChange={(e) => setSub({ ...sub, title: e.target.value })} /></label>
              <label>{t("copy.your_story")}<textarea style={{ ...inp, minHeight: 110 }} maxLength={2000} value={sub.pitch} onChange={(e) => setSub({ ...sub, pitch: e.target.value })} /></label>
              <button type="submit" style={btn} disabled={busy}>{busy ? t("copy.sending") : t("copy.send_to_the_newsroom")}</button>
            </form>
          )}
        </div>
        <div style={card}><h2>{t("copy.your_data")}</h2><p><a href="/account/preferences">{t("copy.notification_preferences")}</a></p><p><a href="/api/account?download=1">{t("copy.export_profile_and_linked_purchases")}</a></p><p>{t("copy.request_account_deletion_the_team_reviews_the_request_and_retains_financial")}</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setMsg(null);try{const r=await fetchWithTimeout('/api/account/privacy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation:deleteConfirmation})});const d=await r.json();if(!r.ok)throw new Error();setMsg({...factoryIssue('Deletion request received. Reference: {reference}'),values:{reference:d.request.id}});setProbe(probe+1);setDeleteConfirmation('');}catch{setMsg({"key":"copy.your_request_could_not_be_saved_please_try_again"});}finally{setBusy(false);}}}><label>{t("copy.type_delete_my_account_to_confirm")}<input style={inp} value={deleteConfirmation} onChange={e=>setDeleteConfirmation(e.target.value)} required /></label><button type="submit" style={{...btn,marginTop:12}} disabled={busy||deleteConfirmation!=='DELETE MY ACCOUNT'}>{t("copy.request_deletion")}</button></form>{wallet?.requests.map((r:any)=><p key={r.id}>{t("copy.request")} {r.id}: {t(statusIssue(r.status,'privacy').key)}</p>)}<p><a href="/privacy-policy">{t("copy.your_privacy_rights")}</a> · <a href="/">{t("copy.back_to_the_tour")}</a></p></div>
      </div>
    );
  }

  return (
    <div style={{ ...card, maxWidth: 440, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'inherit', margin: '0 0 4px' }}>{mode === 'login' ? t("copy.sign_in") : mode === 'forgot' ? t("copy.reset_your_password") : mode === 'reset' ? t("copy.choose_a_new_password") : t("copy.create_your_account")}</h2>
      {mode==='login'&&<GoogleSignIn endpoint="/api/auth/google" onSuccess={d=>{setUser(d.user);setMsg(null)}}/>}
      <div style={{ fontSize: 15, color: '#555', marginBottom: 14 }}>{mode === 'forgot' ? t('copy.enter_the_email_used_for_your_account') : mode === 'reset' ? t('copy.use_at_least_8_characters_all_other_devices_will_be_signed') : t('copy.use_your_email_or_kenyan_phone_number')}</div>
      <form style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); void go(mode); }}>
        {mode === 'signup' && <label>{t("copy.name")}<input style={inp} maxLength={100} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>}
        {mode !== 'reset' && <label>{t("copy.email")}<input style={inp} type="email" required={mode==='forgot'} maxLength={254} autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>}
        {(mode === 'login' || mode === 'signup') && <label>{t("copy.or_kenyan_phone_number")}<input style={inp} type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>}
        {mode !== 'forgot' && <label>{t("copy.password")}<input style={inp} type="password" required minLength={mode === 'reset' ? 8 : 6} maxLength={100} autoComplete={mode !== 'login' ? 'new-password' : 'current-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>}
        {mode === 'signup' && <><p style={{ margin: '4px 0', fontSize: 14, lineHeight: 1.5 }}><span lang="en-KE">Accounts are for adults aged 18 and over. Under 18? Ask a parent or guardian to manage bookings and purchases. You can explore the tour without an account.</span></p><label className="ugt-account-consent"><input type="checkbox" required checked={eligible} onChange={e => setEligible(e.target.checked)} />{t("copy.i_am_18_or_older")}</label><label className="ugt-account-consent"><input type="checkbox" required checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} /><span>{t("copy.i_accept_the")} <a href="/terms">{t("copy.terms_2")}</a> {t("copy.and_have_read_the")} <a href="/privacy-policy">{t("copy.privacy_policy_3")}</a>{t("copy.")}</span></label></>}
        {msg && <div role="alert" style={{ color: '#a00', fontSize: 14 }}>{msg?t(msg.key,msg.values):null}</div>}
        <button type="submit" style={btn} disabled={busy}>{busy ? t("copy.please_wait") : mode === 'login' ? t("copy.sign_in") : mode === 'forgot' ? t("copy.send_reset_link") : mode === 'reset' ? t("copy.save_new_password") : t("copy.create_account")}</button>
        <button type="button" disabled={busy} style={{ background: 'none', border: 'none', color: '#9a145d', fontWeight: 700, cursor: 'pointer', fontSize: 14, minHeight: 44, padding: '10px 12px' }}
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null); }}>
          {mode === 'login' ? t("copy.new_here_create_an_account") : t("copy.already_have_an_account_log_in")}
        </button>
        {mode === 'login' && <button type="button" style={{...btn,background:'#fff',color:'#9a145d'}} onClick={()=>{setMode('forgot');setMsg(null)}}>{t("copy.forgot_password")}</button>}
        <a href="mailto:admin@urbangangtour.co.ke?subject=Account%20access%20help">{t("copy.need_help_accessing_your_account")}</a>
        <a href="/">{t("copy.back_to_the_tour")}</a>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#666' }}><span lang="en-KE">By continuing you accept our </span><a href="/terms" style={{ color: '#E6218C' }}>{t("copy.terms_2")}</a> {t("copy.and")} <a href="/privacy-policy" style={{ color: '#E6218C' }}>{t("copy.privacy_policy_3")}</a><span lang="en-KE">. We protect your data under the Kenya Data Protection Act 2019.</span></div>
      </form>
    </div>
  );
}
