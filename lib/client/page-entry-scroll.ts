declare global {
 interface Window {__ugtResetPageEntryScroll?:(resetTop?:boolean)=>void}
}

/** One document-level listener set also survives back/forward cache restores. */
export function installPageEntryScroll(target:Window):(resetTop?:boolean)=>void {
 if(target.__ugtResetPageEntryScroll)return target.__ugtResetPageEntryScroll;
 let frame=0;
 const view=target as Window&typeof globalThis;
 let mutations:MutationObserver|undefined,resize:ResizeObserver|undefined;
 const stopWaiting=()=>{mutations?.disconnect();resize?.disconnect();mutations=undefined;resize=undefined};
 const position=(resetTop:boolean)=>{
  stopWaiting();
  const hash=target.location.hash;
  if(!hash){if(resetTop)target.scrollTo({top:0,left:0,behavior:'instant'});return}
  // Manual history restoration also disables reliable native hash positioning
  // on reload. Restore a real element destination, not browser text fragments.
  if(hash.includes(':~:'))return;
  let id:string;try{id=decodeURIComponent(hash.slice(1))}catch{return}
  const restore=()=>{
   if(target.location.hash!==hash){stopWaiting();return}
   const anchor=target.document.getElementById(id);
   if(!anchor){
    if(!mutations){mutations=new view.MutationObserver(restore);mutations.observe(target.document,{childList:true,subtree:true})}
    return;
   }
   mutations?.disconnect();mutations=undefined;
   // Next can insert a streamed anchor in a hidden container before exposing it.
   // Its first visible layout, rather than document load, is the scroll boundary.
   if(anchor.getClientRects().length){stopWaiting();anchor.scrollIntoView({block:'start',behavior:'instant'});return}
   if(!resize){resize=new view.ResizeObserver(restore);resize.observe(anchor)}
  };
  restore();
 };
 const schedule=(resetTop:boolean)=>{
  if(frame)target.cancelAnimationFrame(frame);
  frame=0;
  position(resetTop);
  frame=target.requestAnimationFrame(()=>{
   frame=0;
   position(resetTop);
  });
 };
 const reset=(resetTop=true)=>schedule(resetTop),restoreHash=()=>reset(false);
 const cancel=()=>{if(frame)target.cancelAnimationFrame(frame);frame=0;stopWaiting()};
 try{target.history.scrollRestoration='manual'}catch{/* Older browsers may not expose restoration controls. */}
 // Chrome hides pure text directives from location.hash. Reset only before
 // native fragment positioning; later document events must not erase it.
 position(true);
 target.__ugtResetPageEntryScroll=reset;
 target.addEventListener('pageshow',restoreHash);
 target.addEventListener('popstate',()=>reset());
 target.addEventListener('hashchange',()=>{cancel();restoreHash()});
 target.addEventListener('pagehide',cancel);
 target.document.addEventListener('DOMContentLoaded',restoreHash,{once:true});
 return reset;
}

// Keep the early head script literal. Serializing the compiled function with
// toString() captures bundler-only name helpers that do not exist in the page.
// The bundled-script regression exercises the same scroll/hash contract below;
// AppShell reuses this installed reset instead of adding another listener set.
export const PAGE_ENTRY_BOOTSTRAP=`(function(target){
 if(target.__ugtResetPageEntryScroll)return target.__ugtResetPageEntryScroll;
 let frame=0,mutations,resize;
 const stopWaiting=()=>{mutations?.disconnect();resize?.disconnect();mutations=undefined;resize=undefined};
 const position=(resetTop)=>{
  stopWaiting();
  const hash=target.location.hash;
  if(!hash){if(resetTop)target.scrollTo({top:0,left:0,behavior:'instant'});return}
  if(hash.includes(':~:'))return;
  let id;try{id=decodeURIComponent(hash.slice(1))}catch{return}
  const restore=()=>{
   if(target.location.hash!==hash){stopWaiting();return}
   const anchor=target.document.getElementById(id);
   if(!anchor){
    if(!mutations){mutations=new target.MutationObserver(restore);mutations.observe(target.document,{childList:true,subtree:true})}
    return;
   }
   mutations?.disconnect();mutations=undefined;
   if(anchor.getClientRects().length){stopWaiting();anchor.scrollIntoView({block:'start',behavior:'instant'});return}
   if(!resize){resize=new target.ResizeObserver(restore);resize.observe(anchor)}
  };
  restore();
 };
 const schedule=(resetTop)=>{
  if(frame)target.cancelAnimationFrame(frame);
  frame=0;position(resetTop);
  frame=target.requestAnimationFrame(()=>{frame=0;position(resetTop)});
 };
 const reset=(resetTop=true)=>schedule(resetTop),restoreHash=()=>reset(false);
 const cancel=()=>{if(frame)target.cancelAnimationFrame(frame);frame=0;stopWaiting()};
 try{target.history.scrollRestoration='manual'}catch{}
 position(true);target.__ugtResetPageEntryScroll=reset;
 target.addEventListener('pageshow',restoreHash);
 target.addEventListener('popstate',()=>reset());
 target.addEventListener('hashchange',()=>{cancel();restoreHash()});
 target.addEventListener('pagehide',cancel);
 target.document.addEventListener('DOMContentLoaded',restoreHash,{once:true});
 return reset;
})(window);`;
