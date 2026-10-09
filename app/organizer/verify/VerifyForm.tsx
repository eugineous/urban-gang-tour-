'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { shell, wrap, card, h1, api, useToast, Toast } from '../ui';

export default function VerifyForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'working' | 'ok' | 'bad' | 'retry'>('working');
  const [detail, setDetail] = useState('');
  const [attempt,setAttempt]=useState(0);
  const [toast, say] = useToast();

  useEffect(() => {
    if (!token) { setState('bad'); setDetail('This page needs a verification link from your signup email.'); return; }
    setState('working');
    let cancelled=false;
    api(`/api/organizer/verify?token=${encodeURIComponent(token)}`).then(({ status,data }) => {
      if(cancelled)return;
      if(status===0||status>=500||status===429){setState('retry');setDetail('We could not check your link. It has not been confirmed as invalid. Please try again.');return}
      if (data.ok) setState('ok');
      else {
        setState('bad');
        const msg = data.error === 'token_expired'
          ? 'That link expired (24 hours). Contact admin@urbangangtour.co.ke for a fresh one.'
          : 'That link is invalid or already used.';
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
        <h1 style={h1}>Email verification</h1>
        <div style={card}>
          {state === 'working' && <p style={{ lineHeight: 1.6 }}>Confirming your address…</p>}
          {state === 'ok' && <p style={{ lineHeight: 1.6 }}>Address confirmed. We will email you once your application is reviewed — then you can <a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>log in</a>.</p>}
          {state === 'retry' && <><p role="alert">{detail}</p><button onClick={()=>setAttempt(n=>n+1)} style={{minHeight:44,font:'inherit'}}>Try verification again</button></>}
          {state === 'bad' && <p style={{ lineHeight: 1.6 }}>{detail}</p>}
        </div>
      </div>
    </div>
  );
}
