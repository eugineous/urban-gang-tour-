'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {organizerAuthMessages,type CustomerIssue} from '@/ui/i18n/catalogues/organizer-auth';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { shell, wrap, card, h1, api, useToast, Toast } from '../ui';

export default function VerifyForm() {
 const t=useMessages(organizerAuthMessages);
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'working' | 'ok' | 'bad' | 'retry'>('working');
  const [detail, setDetail] = useState<CustomerIssue|null>(null);
  const [attempt,setAttempt]=useState(0);
  const [toast, say] = useToast<CustomerIssue>();

  useEffect(() => {
    if (!token) { setState('bad'); setDetail({"key":"copy.this_page_needs_a_verification_link_from_your_signup_email"}); return; }
    setState('working');
    let cancelled=false;
    api(`/api/organizer/verify?token=${encodeURIComponent(token)}`).then(({ status,data }) => {
      if(cancelled)return;
      if(status===0||status>=500||status===429){setState('retry');setDetail({"key":"copy.we_could_not_check_your_link_it_has_not_been_confirmed"});return}
      if (data.ok) setState('ok');
      else {
        setState('bad');
        const msg:CustomerIssue = data.error === 'token_expired'
          ? {"key":"copy.that_link_expired_24_hours_contact_admin_urbangangtour_co_ke_for"}
          : {"key":"copy.that_link_is_invalid_or_already_used"};
        setDetail(msg);
        say(msg);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return()=>{cancelled=true};
  }, [token,attempt]);

  return (
    <div style={shell}>
      <div style={{ ...wrap, maxWidth: 420 }}>
        <Toast msg={toast} />
        <h1 style={h1}>{t("copy.email_verification")}</h1>
        <div style={card}>
          {state === 'working' && <p style={{ lineHeight: 1.6 }}>{t("copy.confirming_your_address")}</p>}
          {state === 'ok' && <p style={{ lineHeight: 1.6 }}>{t("copy.address_confirmed_we_will_email_you_once_your_application_is_reviewed")} <a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>{t("copy.log_in_2")}</a>{t("copy.")}</p>}
          {state === 'retry' && <><p role="alert">{detail?t(detail.key,detail.values):null}</p><button onClick={()=>setAttempt(n=>n+1)} style={{minHeight:44,font:'inherit'}}>{t("copy.try_verification_again")}</button></>}
          {state === 'bad' && <p style={{ lineHeight: 1.6 }}>{detail?t(detail.key,detail.values):null}</p>}
        </div>
      </div>
    </div>
  );
}
