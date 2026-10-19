'use client';
import {useEffect,useState} from 'react';
import {FOCUS_VIEW_KEY,setFocusView} from '@/lib/client/display-preferences';
export default function FocusViewSetting(){
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{const sync=()=>setEnabled(document.documentElement.dataset.focusView==='true');
  const storage=(e:StorageEvent)=>{if(e.key===FOCUS_VIEW_KEY||e.key===null){let value=false;try{value=JSON.parse(localStorage.getItem(FOCUS_VIEW_KEY)||'false')===true}catch{}setFocusView(value)}};
  sync();addEventListener('ugt-focus-view',sync);addEventListener('storage',storage);return()=>{removeEventListener('ugt-focus-view',sync);removeEventListener('storage',storage)};
 },[]);
 return <div><button className="button" type="button" aria-pressed={enabled} onClick={()=>setFocusView(!enabled)}>Focus view: {enabled?'on':'off'}</button><p role="status">{enabled?'Focus view is on. Optional animations, automatic video and campaign pop-ups are reduced.':'Focus view is off. You can also use your device’s reduced-motion setting.'}</p></div>;
}
