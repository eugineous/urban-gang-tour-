// Navigation and overlays have different lifecycles. Opening a menu is not
// leaving the page; a close must not restart a video the visitor already paused.
export const MEDIA_LIFECYCLE_BOOTSTRAP = `(()=>{
 const leaving=new Set(),overlay=new Set();let overlayDepth=0;
 const rememberAndPause=set=>document.querySelectorAll('video').forEach(v=>{if(!v.paused&&!v.ended){set.add(v);v.pause()}});
 const resume=set=>{let focus=false;try{focus=JSON.parse(localStorage.getItem('ugt-new-preview-v1focusView')||'false')}catch{}
  if(!document.hidden&&!document.documentElement.dataset.pageLeaving&&!focus&&!matchMedia('(prefers-reduced-motion:reduce)').matches&&!navigator.connection?.saveData){set.forEach(v=>{const r=v.getBoundingClientRect();if(v.isConnected&&r.bottom>0&&r.top<innerHeight)v.play().catch(()=>{})})}set.clear()};
 const pause=()=>{document.documentElement.dataset.pageLeaving='true';dispatchEvent(new Event('ugt-page-leaving'));rememberAndPause(leaving)};
 addEventListener('ugt-overlay-change',e=>{if(e.detail){overlayDepth++;rememberAndPause(overlay)}else{overlayDepth=Math.max(0,overlayDepth-1);if(overlayDepth===0)resume(overlay)}});
 document.addEventListener('click',e=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const a=e.target.closest?.('a[href]');if(!a||a.target==='_blank'||a.hasAttribute('download'))return;try{const u=new URL(a.href,location.href);if(u.origin===location.origin&&(u.pathname!==location.pathname||u.search!==location.search))pause()}catch{}},true);
 addEventListener('beforeunload',pause);addEventListener('pagehide',pause);
 addEventListener('pageshow',e=>{if(e.persisted){delete document.documentElement.dataset.pageLeaving;dispatchEvent(new Event('ugt-motion-resume'));resume(leaving)}});
})();`;
