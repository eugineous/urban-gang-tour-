'use client';
import {useState} from 'react';
import {NEWS_DRAFT_MODELS,type NewsProvider,type NewsProviderReadiness,type UrbanNewsConfig} from '@/lib/shared/urban-news';
import {detectNewsProvider,validNewsProviderKey} from '@/lib/shared/news-provider-key';
import styles from './UrbanNewsDesk.module.css';

type AccessResult={
 access?:'public_catalogue'|'authenticated_public_catalogue'|'private_catalogue';
 providers?:NewsProviderReadiness;
 config?:UrbanNewsConfig;
 configRevision?:number;
};
type Props={
 busy:boolean;
 config:UrbanNewsConfig;
 providers:NewsProviderReadiness|null;
 send:(payload:Record<string,unknown>)=>Promise<AccessResult|null>;
 onProviderState:(state:AccessResult)=>void;
};
const names:Record<NewsProvider,string>={gemini:'Google Gemini',openai:'OpenAI',qwen:'QwenCloud · Singapore',nvidia:'NVIDIA'};

export default function NewsProviderAccess({busy,config,providers,send,onProviderState}:Props){
 const [selected,setSelected]=useState<NewsProvider|''>(''),[paste,setPaste]=useState(''),[visible,setVisible]=useState(false);
 const [lastProvider,setLastProvider]=useState<NewsProvider|null>(null),[status,setStatus]=useState('');
 const key=paste.trim(),detected=detectNewsProvider(key),destination=selected||detected;
 const provider=destination||lastProvider||config.provider,stored=providers?.providers[provider];
 const valid=!!destination&&validNewsProviderKey(destination,key);
 const model=provider===config.provider?config.model:NEWS_DRAFT_MODELS[provider][0];

 function clearPaste(){setPaste('');setVisible(false)}
 async function check(saved=false){
  const prefix=saved?'Key saved. ':'';
  setStatus(prefix+'Checking '+names[provider]+' access…');
  const result=await send({action:'key.check',provider,model});
  const outcome=result?.access;
  if(outcome==='authenticated_public_catalogue'){
   setStatus(prefix+'NVIDIA authenticated the key. Its public catalogue lists '+model+'. Drafting access remains untested.');
  }else if(outcome==='public_catalogue'){
   setStatus(prefix+'NVIDIA lists '+model+' publicly. Its account service declined the identity check. Check the key and its NGC permissions.');
  }else if(outcome==='private_catalogue'){
   setStatus(prefix+names[provider]+' accepted the key for the model catalogue and listed '+model+'.');
  }else{
   setStatus(prefix+'Access check incomplete. Review the provider error and retry Check model access.');
  }
 }
 async function save(){
  if(!valid||!destination)return;
  clearPaste();
  const result=await send({action:'key.save',provider:destination,key});
  if(!result?.providers){setStatus('Key save was not confirmed. Reload provider settings to check.');return}
  onProviderState(result);setLastProvider(destination);setSelected('');
  await check(true);
 }
 async function remove(){
  const result=await send({action:'key.delete',provider});
  if(result?.providers){onProviderState(result);setStatus('Managed key removed. Automatic drafting was paused.')}
 }
 function select(next:NewsProvider|''){
  if(destination&&next!==destination)clearPaste();
  setSelected(next);setStatus('');
 }
 return <section>
  <h3>Provider access</h3>
  <p>Paste a full key to identify its provider on this device. Saving encrypts the key and checks access without generating a draft. Automatic drafting stays paused.</p>
  <label>API key<input type={visible?'text':'password'} spellCheck={false} autoCapitalize="none" autoComplete="off" value={paste} disabled={busy} maxLength={4096} onChange={e=>{setPaste(e.target.value);setStatus('')}}/></label>
  <label>Credential provider<select aria-label="Credential provider" value={selected||detected||''} disabled={busy} onChange={e=>select(e.target.value as NewsProvider|'')}>
   <option value="">Identify from key</option>
   {(Object.keys(names) as NewsProvider[]).map(p=><option key={p} value={p}>{names[p]}</option>)}
  </select></label>
  {key&&<p>{!destination?'Choose the provider that issued this key.':detected&&selected&&detected!==selected?'The key prefix belongs to '+names[detected]+'. Discard the paste and choose its provider.':!valid?'Paste the complete, unmasked key.':detected?'Recognized '+names[detected]+' key format.':'Selected provider: '+names[provider]+'.'}</p>}
  {provider==='qwen'&&<p>Use a Singapore Pay-As-You-Go application key for QwenCloud.</p>}
  <p>{names[provider]} · {stored?.keySource==='managed'?(stored.configured?'Encrypted key saved.':'Saved key cannot be read. Replace it.'):stored?.keySource==='environment'?'Server key configured.':'No key saved.'}</p>
  <div className={styles.actions}>
   <button type="button" disabled={busy||!paste} onClick={()=>setVisible(!visible)}>{visible?'Hide pasted key':'Show pasted key'}</button>
   <button type="button" disabled={busy||!paste} onClick={()=>{clearPaste();setStatus('')}}>Discard paste</button>
   <button type="button" disabled={busy||!valid} onClick={()=>void save()}>Save key</button>
   <button type="button" className={styles.quiet} disabled={busy||!!paste||stored?.keySource!=='managed'} onClick={()=>void remove()}>Remove key</button>
   <button type="button" className={styles.quiet} disabled={busy||!!paste||!stored?.configured} onClick={()=>void check()}>Check model access</button>
  </div>
  {status&&<p role="status">{status}</p>}
 </section>;
}
