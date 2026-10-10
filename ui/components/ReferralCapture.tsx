'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {AFFILIATE_REFERRAL_KEY,AffiliateReferral,clearAffiliateReferral,readAffiliateReferral} from '@/lib/client/affiliate-referral';
export default function ReferralCapture(){
 const pathname=usePathname();const[referral,setReferral]=useState<AffiliateReferral|null>(null);
 useEffect(()=>{setReferral(readAffiliateReferral());const change=()=>setReferral(readAffiliateReferral());window.addEventListener('ugt-referral-changed',change);return()=>window.removeEventListener('ugt-referral-changed',change)},[]);
 useEffect(()=>{const code=new URLSearchParams(location.search).get('ref');if(!code||!/^[a-f0-9]{24}$/.test(code))return;const controller=new AbortController();fetch('/api/affiliates/referral?code='+encodeURIComponent(code),{signal:controller.signal}).then(async r=>{if(!r.ok)return;const data=await r.json();if(!data.valid)return;const value={code:data.code,termsVersion:data.termsVersion,capturedAt:Date.now()};try{sessionStorage.setItem(AFFILIATE_REFERRAL_KEY,JSON.stringify(value));setReferral(value);window.dispatchEvent(new Event('ugt-referral-changed'))}catch{}}).catch(()=>{});return()=>controller.abort()},[pathname]);
 if(!referral||pathname.startsWith('/admin')||pathname.startsWith('/organizer'))return null;
 return <aside className="referral-disclosure" aria-label="Referral disclosure"><p>You arrived through a referral. An approved partner may earn commission on eligible Urban Gang Tour tickets. Your price stays the same.</p><button type="button" onClick={()=>{clearAffiliateReferral();setReferral(null)}}>Remove referral</button></aside>;
}
