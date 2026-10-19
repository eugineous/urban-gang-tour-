/** Necessary, opaque send-recovery key. Never stores the recipient or message. */
export function legacyReplyIntent(scope:string){try{const key=sessionStorage.getItem('ugt-reply-intent:'+scope);return key&&/^[A-Za-z0-9_-]{32,128}$/.test(key)?key:null}catch{return null}}
export function replyIntent(scope:string){
 const storageKey='ugt-reply-intent:'+scope;
 try{const saved=sessionStorage.getItem(storageKey);if(saved&&/^[A-Za-z0-9_-]{32,128}$/.test(saved))return saved;
  const key=crypto.randomUUID();sessionStorage.setItem(storageKey,key);if(sessionStorage.getItem(storageKey)!==key)throw Error();return key;
 }catch{throw Error('reply_recovery_storage_unavailable')}
}
export function clearReplyIntent(scope:string){try{sessionStorage.removeItem('ugt-reply-intent:'+scope)}catch{}}
