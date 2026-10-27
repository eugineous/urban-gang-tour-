'use client';
import {useEffect,useState} from 'react';
import {privacyMessages} from '@/ui/i18n/catalogues/privacy';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {FOCUS_VIEW_KEY,setFocusView} from '@/lib/client/display-preferences';
export default function FocusViewSetting(){
 const t=useMessages(privacyMessages);
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{const sync=()=>setEnabled(document.documentElement.dataset.focusView==='true');
  const storage=(e:StorageEvent)=>{if(e.key===FOCUS_VIEW_KEY||e.key===null){let value=false;try{value=JSON.parse(localStorage.getItem(FOCUS_VIEW_KEY)||'false')===true}catch{}setFocusView(value)}};
  sync();addEventListener('ugt-focus-view',sync);addEventListener('storage',storage);return()=>{removeEventListener('ugt-focus-view',sync);removeEventListener('storage',storage)};
 },[]);
 return <div><button className="button" type="button" aria-pressed={enabled} onClick={()=>setFocusView(!enabled)}>{t('focus.prefix')}{t(enabled?'focus.on':'focus.off')}</button><p role="status">{t(enabled?'focus.enabled':'focus.disabled')}</p></div>;
}
